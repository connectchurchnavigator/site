import httpx
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import xml.etree.ElementTree as ET

class DomainService:
    def __init__(self):
        self.api_user = os.getenv('NAMECHEAP_API_USER')
        self.api_key = os.getenv('NAMECHEAP_API_KEY')
        self.username = os.getenv('NAMECHEAP_USERNAME')
        self.client_ip = os.getenv('NAMECHEAP_CLIENT_IP')
        self.base_url = 'https://api.namecheap.com/xml.response'
        
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
        full_domain = f"{domain}.{tld}"
        params = self._build_params('namecheap.domains.check', {
            'DomainList': full_domain
        })
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(self.base_url, params=params)
            root = ET.fromstring(response.text)
            
            result = root.find('.//{http://api.namecheap.com/xml.response}DomainCheckResult')
            available = result.get('Available') == 'true'
            
            price_data = await self._get_pricing(tld)
            
            alternatives = []
            if not available:
                alternatives = await self._get_alternatives(domain, tld)
            
            return {
                'available': available,
                'domain': full_domain,
                'price': price_data.get('price', 8.0),
                'alternatives': alternatives
            }
    
    async def _get_pricing(self, tld: str) -> Dict:
        prices = {
            'co.uk': 7.50,
            'com': 10.50,
            'org.uk': 7.50,
            'church': 12.00,
            'uk': 7.50
        }
        return {'price': prices.get(tld, 10.0)}
    
    async def _get_alternatives(self, domain: str, tld: str) -> List[str]:
        alternatives = []
        alt_tlds = ['co.uk', 'com', 'org.uk', 'church'] if tld not in ['co.uk', 'com', 'org.uk', 'church'] else []
        
        for alt_tld in alt_tlds:
            if alt_tld != tld:
                result = await self.check_availability(domain, alt_tld)
                if result['available']:
                    alternatives.append(f"{domain}.{alt_tld}")
        
        suffixes = ['church', 'community', 'online', 'fellowship']
        for suffix in suffixes:
            alt_domain = f"{domain}{suffix}"
            result = await self.check_availability(alt_domain, tld)
            if result['available']:
                alternatives.append(f"{alt_domain}.{tld}")
                if len(alternatives) >= 5:
                    break
        
        return alternatives[:5]
    
    async def purchase_domain(self, domain: str, tld: str, years: int = 1) -> Dict:
        full_domain = f"{domain}.{tld}"
        params = self._build_params('namecheap.domains.create', {
            'DomainName': full_domain,
            'Years': str(years),
            'RegistrantFirstName': 'ChurchNavigator',
            'RegistrantLastName': 'Ltd',
            'RegistrantAddress1': '123 Faith Street',
            'RegistrantCity': 'London',
            'RegistrantStateProvince': 'London',
            'RegistrantPostalCode': 'SW1A 1AA',
            'RegistrantCountry': 'GB',
            'RegistrantPhone': '+44.2012345678',
            'RegistrantEmailAddress': 'domains@churchnavigator.com',
            'TechFirstName': 'ChurchNavigator',
            'TechLastName': 'Ltd',
            'TechAddress1': '123 Faith Street',
            'TechCity': 'London',
            'TechStateProvince': 'London',
            'TechPostalCode': 'SW1A 1AA',
            'TechCountry': 'GB',
            'TechPhone': '+44.2012345678',
            'TechEmailAddress': 'domains@churchnavigator.com',
            'AdminFirstName': 'ChurchNavigator',
            'AdminLastName': 'Ltd',
            'AdminAddress1': '123 Faith Street',
            'AdminCity': 'London',
            'AdminStateProvince': 'London',
            'AdminPostalCode': 'SW1A 1AA',
            'AdminCountry': 'GB',
            'AdminPhone': '+44.2012345678',
            'AdminEmailAddress': 'domains@churchnavigator.com',
            'AuxBillingFirstName': 'ChurchNavigator',
            'AuxBillingLastName': 'Ltd',
            'AuxBillingAddress1': '123 Faith Street',
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
            
            domain_result = root.find('.//{http://api.namecheap.com/xml.response}DomainCreateResult')
            if domain_result is None:
                raise Exception('Domain purchase failed')
            
            domain_id = domain_result.get('DomainID')
            expiry_date = datetime.now() + timedelta(days=365 * years)
            
            return {
                'domain_id': domain_id,
                'domain': full_domain,
                'expiry_date': expiry_date.isoformat(),
                'registered': True
            }
    
    async def configure_dns(self, domain: str, tld: str, target_ip: str) -> Dict:
        full_domain = f"{domain}.{tld}"
        params = self._build_params('namecheap.domains.dns.setHosts', {
            'SLD': domain,
            'TLD': tld,
            'HostName1': '@',
            'RecordType1': 'A',
            'Address1': target_ip,
            'TTL1': '300',
            'HostName2': 'www',
            'RecordType2': 'A',
            'Address2': target_ip,
            'TTL2': '300'
        })
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.base_url, params=params)
            root = ET.fromstring(response.text)
            
            result = root.find('.//{http://api.namecheap.com/xml.response}DomainDNSSetHostsResult')
            if result is None:
                raise Exception('DNS configuration failed')
            
            return {
                'configured': True,
                'domain': full_domain,
                'records': [
                    {'type': 'A', 'host': '@', 'value': target_ip},
                    {'type': 'A', 'host': 'www', 'value': target_ip}
                ]
            }
    
    async def verify_dns(self, domain: str) -> Dict:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f'http://{domain}', follow_redirects=True)
                return {'verified': response.status_code < 500, 'domain': domain}
        except:
            return {'verified': False, 'domain': domain}
    
    async def renew_domain(self, domain: str, tld: str, years: int = 1) -> Dict:
        full_domain = f"{domain}.{tld}"
        params = self._build_params('namecheap.domains.renew', {
            'DomainName': full_domain,
            'Years': str(years)
        })
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.base_url, params=params)
            root = ET.fromstring(response.text)
            
            result = root.find('.//{http://api.namecheap.com/xml.response}DomainRenewResult')
            if result is None:
                raise Exception('Domain renewal failed')
            
            expiry_date = datetime.now() + timedelta(days=365 * years)
            
            return {
                'renewed': True,
                'domain': full_domain,
                'expiry_date': expiry_date.isoformat()
            }

domain_service = DomainService()