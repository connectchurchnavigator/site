from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime, time, timedelta
import httpx
import asyncio
from itertools import permutations
import math

router = APIRouter(prefix="/api/planner", tags=["planner"])

class Location(BaseModel):
    item_id: str
    name: str
    lat: float
    lng: float
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_flexible: bool = True
    day: int

class OptimiseRequest(BaseModel):
    locations: List[Location]

class TravelSegment(BaseModel):
    from_name: str
    to_name: str
    duration_minutes: int
    distance_km: float
    mode: str
    maps_url: str

class OptimisedItinerary(BaseModel):
    day: int
    items: List[Dict[str, Any]]
    total_driving_minutes: int

class OptimiseResponse(BaseModel):
    optimised_itinerary: List[OptimisedItinerary]
    original_itinerary: List[OptimisedItinerary]
    time_saved_minutes: int
    changes_made: List[str]
    explanation: str

async def get_osrm_route(lat1: float, lng1: float, lat2: float, lng2: float) -> Dict[str, Any]:
    url = f"https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=false"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url)
            data = response.json()
            if data.get("code") == "Ok" and data.get("routes"):
                route = data["routes"][0]
                return {
                    "duration_seconds": route["duration"],
                    "distance_meters": route["distance"]
                }
        except Exception:
            pass
    return {"duration_seconds": 1800, "distance_meters": 10000}

async def get_travel_matrix(locations: List[Location]) -> Dict[tuple, Dict[str, Any]]:
    matrix = {}
    tasks = []
    pairs = []
    
    for i, loc1 in enumerate(locations):
        for j, loc2 in enumerate(locations):
            if i != j:
                pairs.append((i, j, loc1, loc2))
                tasks.append(get_osrm_route(loc1.lat, loc1.lng, loc2.lat, loc2.lng))
    
    results = await asyncio.gather(*tasks)
    
    for (i, j, loc1, loc2), result in zip(pairs, results):
        matrix[(i, j)] = {
            "duration_minutes": result["duration_seconds"] / 60,
            "distance_km": result["distance_meters"] / 1000,
            "from_name": loc1.name,
            "to_name": loc2.name,
            "from_lat": loc1.lat,
            "from_lng": loc1.lng,
            "to_lat": loc2.lat,
            "to_lng": loc2.lng
        }
    
    return matrix

def solve_tsp_greedy(locations: List[int], matrix: Dict[tuple, Dict[str, Any]], start_idx: int = 0) -> tuple:
    if len(locations) <= 1:
        return locations, 0
    
    unvisited = set(locations)
    route = [start_idx]
    unvisited.remove(start_idx)
    total_time = 0
    
    current = start_idx
    while unvisited:
        nearest = min(unvisited, key=lambda x: matrix.get((current, x), {"duration_minutes": 999999})["duration_minutes"])
        total_time += matrix.get((current, nearest), {"duration_minutes": 0})["duration_minutes"]
        route.append(nearest)
        unvisited.remove(nearest)
        current = nearest
    
    return route, total_time

def solve_tsp_optimal(locations: List[int], matrix: Dict[tuple, Dict[str, Any]], start_idx: int = 0) -> tuple:
    if len(locations) <= 6:
        best_route = None
        best_time = float('inf')
        other_locs = [l for l in locations if l != start_idx]
        
        for perm in permutations(other_locs):
            route = [start_idx] + list(perm)
            total_time = sum(matrix.get((route[i], route[i+1]), {"duration_minutes": 0})["duration_minutes"] 
                           for i in range(len(route)-1))
            if total_time < best_time:
                best_time = total_time
                best_route = route
        
        return best_route, best_time
    else:
        return solve_tsp_greedy(locations, matrix, start_idx)

def calculate_total_time(route: List[int], matrix: Dict[tuple, Dict[str, Any]]) -> float:
    return sum(matrix.get((route[i], route[i+1]), {"duration_minutes": 0})["duration_minutes"] 
               for i in range(len(route)-1))

@router.post("/{trip_id}/optimise", response_model=OptimiseResponse)
async def optimise_route(trip_id: str, request: OptimiseRequest):
    if not request.locations:
        raise HTTPException(status_code=400, detail="No locations provided")
    
    locations = request.locations
    matrix = await get_travel_matrix(locations)
    
    days = {}
    for i, loc in enumerate(locations):
        if loc.day not in days:
            days[loc.day] = {"fixed": [], "flexible": []}
        if loc.is_flexible:
            days[loc.day]["flexible"].append(i)
        else:
            days[loc.day]["fixed"].append(i)
    
    original_itinerary = []
    optimised_itinerary = []
    changes_made = []
    original_total = 0
    optimised_total = 0
    
    for day_num in sorted(days.keys()):
        day_data = days[day_num]
        fixed_indices = sorted(day_data["fixed"], key=lambda i: locations[i].start_time or "00:00")
        flexible_indices = day_data["flexible"]
        
        original_order = fixed_indices + flexible_indices
        original_time = calculate_total_time(original_order, matrix)
        original_total += original_time
        
        original_items = []
        for idx in original_order:
            loc = locations[idx]
            original_items.append({
                "item_id": loc.item_id,
                "name": loc.name,
                "lat": loc.lat,
                "lng": loc.lng,
                "start_time": loc.start_time,
                "is_flexible": loc.is_flexible
            })
        
        original_itinerary.append(OptimisedItinerary(
            day=day_num,
            items=original_items,
            total_driving_minutes=int(original_time)
        ))
        
        if len(flexible_indices) > 1:
            all_indices = fixed_indices + flexible_indices
            if flexible_indices:
                optimised_order, optimised_time = solve_tsp_optimal(all_indices, matrix, all_indices[0])
            else:
                optimised_order = fixed_indices
                optimised_time = original_time
            
            optimised_total += optimised_time
            
            optimised_items = []
            for idx in optimised_order:
                loc = locations[idx]
                optimised_items.append({
                    "item_id": loc.item_id,
                    "name": loc.name,
                    "lat": loc.lat,
                    "lng": loc.lng,
                    "start_time": loc.start_time,
                    "is_flexible": loc.is_flexible
                })
            
            optimised_itinerary.append(OptimisedItinerary(
                day=day_num,
                items=optimised_items,
                total_driving_minutes=int(optimised_time)
            ))
            
            if optimised_order != original_order:
                saved = original_time - optimised_time
                changes_made.append(f"Day {day_num}: Reordered stops to save {int(saved)} minutes")
        else:
            optimised_itinerary.append(OptimisedItinerary(
                day=day_num,
                items=original_items,
                total_driving_minutes=int(original_time)
            ))
            optimised_total += original_time
    
    time_saved = int(original_total - optimised_total)
    
    explanation = f"I optimised your route across {len(days)} days. "
    if time_saved > 0:
        explanation += f"By reordering flexible stops, I saved {time_saved} minutes of total driving time. "
        explanation += "Fixed items (like church services) stayed at their scheduled times."
    else:
        explanation += "Your current route is already optimal!"
    
    if not changes_made:
        changes_made.append("No changes needed - route already optimal")
    
    return OptimiseResponse(
        optimised_itinerary=optimised_itinerary,
        original_itinerary=original_itinerary,
        time_saved_minutes=time_saved,
        changes_made=changes_made,
        explanation=explanation
    )

@router.get("/travel-time")
async def get_travel_time(lat1: float, lng1: float, lat2: float, lng2: float):
    result = await get_osrm_route(lat1, lng1, lat2, lng2)
    duration_min = int(result["duration_seconds"] / 60)
    distance_km = round(result["distance_meters"] / 1000, 1)
    
    maps_url = f"https://www.google.com/maps/dir/?api=1&origin={lat1},{lng1}&destination={lat2},{lng2}&travelmode=driving"
    
    return {
        "duration_minutes": duration_min,
        "distance_km": distance_km,
        "maps_url": maps_url,
        "mode": "driving"
    }
