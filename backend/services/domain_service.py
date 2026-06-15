import os
import httpx
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import hashlib

class DomainService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.api_user = os.getenv('NAMECHEAP_API_USER')
        self.api_key = os.getenv('NAMECHEAP_API_KEY')
        self.username = os.getenv('NAMECHEAP_USERNAME')
        self.client_ip = os.getenv('NAMECHEAP_CLIENT_IP')
        self.base_url = 'https://api.namecheap.com/xml.response'
        self.railway_ip = os.getenv('RAILWAY_IP', '147.185.221.23')
        
    def _build_params(self, command: str, extra_params: Dict = None) -> Dict:
        params = {
            'ApiUser': self.api_user,
            'ApiKey': self.api_key,
            'UserName': self.username,
            'ClientIp': self.client_ip,
            'Command': command
        }
        if extra_params:
            params.update(extra_params)
        return params
    
    async def check_availability(self, domain: str, tld: str) -> Dict:
        cache_key = f"{domain}.{tld}"
        cached = await self.db.domain_cache.find_one({'domain': cache_key})
        
        if cached and cached.get('cached_at') > datetime.utcnow() - timedelta(minutes=5):
            return cached['result']
        
        full_domain = f"{domain}.{tld}"
        params = self._build_params('namecheap.domains.check', {
            'DomainList': full_domain
        })
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(self.base_url, params=params)
            root = ET.fromstring(response.text)
            
            domain_check = root.find('.//{http://api.namecheap.com/xml.response}DomainCheckResult')
            available = domain_check.get('Available') == 'true'
            
            result = {
                'available': available,
                'domain': full_domain,
                'price': self._get_price(tld),
                'alternatives': []
            }
            
            if not available:
                result['alternatives'] = await self._generate_alternatives(domain, tld)
            
            await self.db.domain_cache.update_one(
                {'domain': cache_key},
                {'$set': {'domain': cache_key, 'result': result, 'cached_at': datetime.utcnow()}},
                upsert=True
            )
            
            return result
    
    def _get_price(self, tld: str) -> float:
        prices = {
            'co.uk': 6.99,
            'com': 10.99,
            'church': 29.99,
            'org.uk': 6.99,
            'org': 12.99
        }
        return prices.get(tld, 10.99)
    
    async def _generate_alternatives(self, domain: str, tld: str) -> List[str]:
        alternatives = [
            f"{domain}church.{tld}",
            f"{domain}community.{tld}",
            f"the{domain}.{tld}",
            f"{domain}uk.{tld}"
        ]
        available = []
        for alt in alternatives[:3]:
            result = await self.check_availability(alt.split('.')[0], tld)
            if result['available']:
                available.append(alt)
        return available
    
    async def purchase_domain(self, church_id: str, domain: str, tld: str, years: int = 1) -> Dict:
        full_domain = f"{domain}.{tld}"
        
        params = self._build_params('namecheap.domains.create', {
            'DomainName': full_domain,
            'Years': str(years),
            'RegistrantFirstName': 'ChurchNavigator',
            'RegistrantLastName': 'Admin',
            'RegistrantAddress1': '123 Church Street',
            'RegistrantCity': 'London',
            'RegistrantStateProvince': 'London',
            'RegistrantPostalCode': 'SW1A 1AA',
            'RegistrantCountry': 'GB',
            'RegistrantPhone': '+44.2012345678',
            'RegistrantEmailAddress': 'domains@churchnavigator.com',
            'TechFirstName': 'ChurchNavigator',
            'TechLastName': 'Admin',
            'TechAddress1': '123 Church Street',
            'TechCity': 'London',
            'TechStateProvince': 'London',
            'TechPostalCode': 'SW1A 1AA',
            'TechCountry': 'GB',
            'TechPhone': '+44.2012345678',
            'TechEmailAddress': 'domains@churchnavigator.com',
            'AdminFirstName': 'ChurchNavigator',
            'AdminLastName': 'Admin',
            'AdminAddress1': '123 Church Street',
            'AdminCity': 'London',
            'AdminStateProvince': 'London',
            'AdminPostalCode': 'SW1A 1AA',
            'AdminCountry': 'GB',
            'AdminPhone': '+44.2012345678',
            'AdminEmailAddress': 'domains@churchnavigator.com',
            'AuxBillingFirstName': 'ChurchNavigator',
            'AuxBillingLastName': 'Admin',
            'AuxBillingAddress1': '123 Church Street',
            'AuxBillingCity': 'London',
            'AuxBillingStateProvince': 'London',
            'AuxBillingPostalCode': 'SW1A 1AA',
            'AuxBillingCountry': 'GB',
            'AuxBillingPhone': '+44.2012345678',
            'AuxBillingEmailAddress': 'domains@churchnavigator.com'
        })
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.base_url, params=params)
            root = ET.fromstring(response.text)
            
            domain_create = root.find('.//{http://api.namecheap.com/xml.response}DomainCreateResult')
            if domain_create is None:
                raise Exception(f"Domain purchase failed: {response.text}")
            
            domain_id = domain_create.get('DomainID')
            expiry_date = datetime.utcnow() + timedelta(days=365 * years)
            
            await self.db.church_sites.update_one(
                {'church_id': church_id},
                {'$set': {
                    'domain': full_domain,
                    'domain_id': domain_id,
                    'purchased_at': datetime.utcnow(),
                    'expiry_date': expiry_date,
                    'years': years,
                    'hosting_status': 'pending_dns'
                }},
                upsert=True
            )
            
            return {
                'domain_id': domain_id,
                'domain': full_domain,
                'expiry_date': expiry_date.isoformat()
            }
    
    async def configure_dns(self, church_id: str, domain: str) -> Dict:
        params = self._build_params('namecheap.domains.dns.setHosts', {
            'SLD': domain.split('.')[0],
            'TLD': '.'.join(domain.split('.')[1:]),
            'HostName1': '@',
            'RecordType1': 'A',
            'Address1': self.railway_ip,
            'TTL1': '300',
            'HostName2': 'www',
            'RecordType2': 'A',
            'Address2': self.railway_ip,
            'TTL2': '300'
        })
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.base_url, params=params)
            root = ET.fromstring(response.text)
            
            is_success = root.find('.//{http://api.namecheap.com/xml.response}IsSuccess')
            if is_success is None or is_success.text != 'true':
                raise Exception(f"DNS configuration failed: {response.text}")
            
            await self.db.church_sites.update_one(
                {'church_id': church_id},
                {'$set': {
                    'dns_configured_at': datetime.utcnow(),
                    'hosting_status': 'dns_propagating'
                }}
            )
            
            return {'success': True, 'message': 'DNS configured successfully'}
    
    async def verify_domain(self, church_slug: str) -> Dict:
        site = await self.db.church_sites.find_one({'church_slug': church_slug})
        if not site:
            return {'verified': False, 'message': 'Site not found'}
        
        domain = site.get('domain')
        if not domain:
            return {'verified': False, 'message': 'No domain configured'}
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f'http://{domain}', follow_redirects=True)
                verified = response.status_code in [200, 404]
                
                if verified:
                    await self.db.church_sites.update_one(
                        {'church_slug': church_slug},
                        {'$set': {
                            'dns_verified_at': datetime.utcnow(),
                            'hosting_status': 'active'
                        }}
                    )
                    return {'verified': True, 'message': 'Domain verified and active'}
                else:
                    return {'verified': False, 'message': 'DNS not yet propagated'}
        except Exception as e:
            return {'verified': False, 'message': f'Verification failed: {str(e)}'}
    
    async def check_renewals(self) -> List[Dict]:
        expiring_soon = datetime.utcnow() + timedelta(days=30)
        sites = await self.db.church_sites.find({
            'expiry_date': {'$lte': expiring_soon},
            'hosting_status': 'active'
        }).to_list(length=1000)
        
        return sites
    
    async def renew_domain(self, church_id: str, years: int = 1) -> Dict:
        site = await self.db.church_sites.find_one({'church_id': church_id})
        if not site:
            raise Exception('Site not found')
        
        domain = site['domain']
        sld = domain.split('.')[0]
        tld = '.'.join(domain.split('.')[1:])
        
        params = self._build_params('namecheap.domains.renew', {
            'DomainName': domain,
            'Years': str(years)
        })
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.base_url, params=params)
            root = ET.fromstring(response.text)
            
            domain_renew = root.find('.//{http://api.namecheap.com/xml.response}DomainRenewResult')
            if domain_renew is None:
                raise Exception(f"Domain renewal failed: {response.text}")
            
            new_expiry = datetime.utcnow() + timedelta(days=365 * years)
            
            await self.db.church_sites.update_one(
                {'church_id': church_id},
                {'$set': {
                    'expiry_date': new_expiry,
                    'renewed_at': datetime.utcnow()
                }}
            )
            
            return {
                'success': True,
                'new_expiry': new_expiry.isoformat()
            }
