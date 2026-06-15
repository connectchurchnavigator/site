import os
import hashlib
import requests
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

class DomainService:
    def __init__(self, db):
        self.db = db
        self.api_user = os.getenv('NAMECHEAP_API_USER')
        self.api_key = os.getenv('NAMECHEAP_API_KEY')
        self.username = os.getenv('NAMECHEAP_USERNAME')
        self.client_ip = os.getenv('NAMECHEAP_CLIENT_IP')
        self.base_url = 'https://api.namecheap.com/xml.response'
        self.cache = {}
        
    def _build_params(self, command: str, extra: Dict = None) -> Dict:
        params = {
            'ApiUser': self.api_user,
            'ApiKey': self.api_key,
            'UserName': self.username,
            'ClientIp': self.client_ip,
            'Command': command
        }
        if extra:
            params.update(extra)
        return params
    
    async def check_availability(self, domain: str, tld: str) -> Dict:
        full_domain = f"{domain}.{tld}"
        cache_key = f"availability_{full_domain}"
        
        if cache_key in self.cache:
            cached = self.cache[cache_key]
            if datetime.now() - cached['timestamp'] < timedelta(minutes=5):
                return cached['data']
        
        params = self._build_params('namecheap.domains.check', {
            'DomainList': full_domain
        })
        
        try:
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()
            
            xml_text = response.text
            available = 'Available="true"' in xml_text
            
            price_map = {
                'co.uk': 6.88, 'uk': 6.88, 'org.uk': 6.88,
                'com': 10.98, 'org': 12.98, 'church': 34.88
            }
            price = price_map.get(tld, 10.98)
            
            result = {
                'available': available,
                'domain': full_domain,
                'price': price,
                'alternatives': []
            }
            
            if not available:
                alternatives = [
                    f"{domain}church.{tld}",
                    f"{domain}uk.{tld}",
                    f"the{domain}.{tld}",
                    f"{domain}community.{tld}"
                ]
                result['alternatives'] = alternatives[:3]
            
            self.cache[cache_key] = {
                'timestamp': datetime.now(),
                'data': result
            }
            
            return result
            
        except Exception as e:
            return {
                'available': False,
                'error': str(e),
                'domain': full_domain
            }
    
    async def purchase_domain(self, church_id: str, domain: str, tld: str, years: int = 1) -> Dict:
        full_domain = f"{domain}.{tld}"
        
        params = self._build_params('namecheap.domains.create', {
            'DomainName': full_domain,
            'Years': years,
            'RegistrantFirstName': 'ChurchNavigator',
            'RegistrantLastName': 'Platform',
            'RegistrantAddress1': '123 Church Street',
            'RegistrantCity': 'London',
            'RegistrantStateProvince': 'London',
            'RegistrantPostalCode': 'SW1A 1AA',
            'RegistrantCountry': 'GB',
            'RegistrantPhone': '+44.2012345678',
            'RegistrantEmailAddress': 'domains@churchnavigator.com',
            'TechFirstName': 'ChurchNavigator',
            'TechLastName': 'Platform',
            'TechAddress1': '123 Church Street',
            'TechCity': 'London',
            'TechStateProvince': 'London',
            'TechPostalCode': 'SW1A 1AA',
            'TechCountry': 'GB',
            'TechPhone': '+44.2012345678',
            'TechEmailAddress': 'domains@churchnavigator.com',
            'AdminFirstName': 'ChurchNavigator',
            'AdminLastName': 'Platform',
            'AdminAddress1': '123 Church Street',
            'AdminCity': 'London',
            'AdminStateProvince': 'London',
            'AdminPostalCode': 'SW1A 1AA',
            'AdminCountry': 'GB',
            'AdminPhone': '+44.2012345678',
            'AdminEmailAddress': 'domains@churchnavigator.com',
            'AuxBillingFirstName': 'ChurchNavigator',
            'AuxBillingLastName': 'Platform',
            'AuxBillingAddress1': '123 Church Street',
            'AuxBillingCity': 'London',
            'AuxBillingStateProvince': 'London',
            'AuxBillingPostalCode': 'SW1A 1AA',
            'AuxBillingCountry': 'GB',
            'AuxBillingPhone': '+44.2012345678',
            'AuxBillingEmailAddress': 'domains@churchnavigator.com'
        })
        
        try:
            response = requests.post(self.base_url, data=params, timeout=30)
            response.raise_for_status()
            
            xml_text = response.text
            success = 'Registered="true"' in xml_text or 'Status="Success"' in xml_text
            
            if success:
                expiry_date = datetime.now() + timedelta(days=365 * years)
                
                domain_record = {
                    'church_id': church_id,
                    'domain': full_domain,
                    'tld': tld,
                    'purchased_at': datetime.now(),
                    'expiry_date': expiry_date,
                    'years': years,
                    'auto_renew': True,
                    'status': 'active'
                }
                
                await self.db.church_sites.update_one(
                    {'church_id': church_id},
                    {'$set': {
                        'domain': full_domain,
                        'domain_info': domain_record,
                        'domain_status': 'purchased'
                    }},
                    upsert=True
                )
                
                return {
                    'success': True,
                    'domain': full_domain,
                    'expiry_date': expiry_date.isoformat()
                }
            else:
                return {'success': False, 'error': 'Domain registration failed'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def configure_dns(self, domain: str, railway_ip: str = None) -> Dict:
        if not railway_ip:
            railway_ip = os.getenv('RAILWAY_IP', '104.21.0.0')
        
        domain_parts = domain.split('.')
        if len(domain_parts) < 2:
            return {'success': False, 'error': 'Invalid domain format'}
        
        sld = domain_parts[0]
        tld = '.'.join(domain_parts[1:])
        
        params = self._build_params('namecheap.domains.dns.setHosts', {
            'SLD': sld,
            'TLD': tld,
            'HostName1': '@',
            'RecordType1': 'A',
            'Address1': railway_ip,
            'TTL1': '300',
            'HostName2': 'www',
            'RecordType2': 'A',
            'Address2': railway_ip,
            'TTL2': '300'
        })
        
        try:
            response = requests.post(self.base_url, data=params, timeout=30)
            response.raise_for_status()
            
            xml_text = response.text
            success = 'IsSuccess="true"' in xml_text
            
            if success:
                await self.db.church_sites.update_one(
                    {'domain': domain},
                    {'$set': {
                        'dns_configured': True,
                        'dns_configured_at': datetime.now(),
                        'domain_status': 'dns_configured'
                    }}
                )
                
                return {'success': True, 'domain': domain, 'ip': railway_ip}
            else:
                return {'success': False, 'error': 'DNS configuration failed'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def verify_domain(self, church_slug: str) -> Dict:
        site = await self.db.church_sites.find_one({'church_slug': church_slug})
        if not site or not site.get('domain'):
            return {'verified': False, 'error': 'Site not found'}
        
        domain = site['domain']
        
        try:
            response = requests.get(f'http://{domain}', timeout=5, allow_redirects=True)
            verified = response.status_code == 200
            
            if verified:
                await self.db.church_sites.update_one(
                    {'church_slug': church_slug},
                    {'$set': {
                        'verified': True,
                        'verified_at': datetime.now(),
                        'hosting_status': 'active',
                        'domain_status': 'active'
                    }}
                )
            
            return {'verified': verified, 'domain': domain}
            
        except Exception as e:
            return {'verified': False, 'error': str(e), 'domain': domain}
    
    async def check_renewals(self):
        thirty_days = datetime.now() + timedelta(days=30)
        sites = await self.db.church_sites.find({
            'domain_info.expiry_date': {'$lte': thirty_days},
            'domain_info.auto_renew': True,
            'hosting_status': 'active'
        }).to_list(length=1000)
        
        for site in sites:
            domain_info = site.get('domain_info', {})
            expiry = domain_info.get('expiry_date')
            
            if isinstance(expiry, str):
                expiry = datetime.fromisoformat(expiry)
            
            days_until_expiry = (expiry - datetime.now()).days
            
            if days_until_expiry <= 7:
                await self._auto_renew_domain(site)
            elif days_until_expiry <= 30:
                await self._send_renewal_reminder(site)
    
    async def _auto_renew_domain(self, site: Dict):
        domain = site.get('domain')
        church_id = site.get('church_id')
        
        domain_parts = domain.split('.')
        base_domain = domain_parts[0]
        tld = '.'.join(domain_parts[1:])
        
        result = await self.purchase_domain(church_id, base_domain, tld, years=1)
        
        if result.get('success'):
            await self.db.church_sites.update_one(
                {'domain': domain},
                {'$set': {'domain_info.last_renewed': datetime.now()}}
            )
    
    async def _send_renewal_reminder(self, site: Dict):
        pass

domain_service = None

def get_domain_service(db):
    global domain_service
    if domain_service is None:
        domain_service = DomainService(db)
    return domain_service