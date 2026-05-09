import geonamescache
gc = geonamescache.GeonamesCache()
cities = gc.get_cities()
count = 0
for cid, city in cities.items():
    if 'london' in city['name'].lower():
        print(f"Found: {city['name']}, {city['countrycode']}")
        count += 1
    if count > 5: break
if count == 0:
    print("No cities found for 'london'")
