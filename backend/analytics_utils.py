import os
import httpx
import logging
from datetime import datetime, timedelta, timezone
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
    OrderBy
)

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, property_id=None, credentials_path=None):
        self.property_id = property_id or os.environ.get('GA4_PROPERTY_ID')
        self.clarity_project_id = os.environ.get('CLARITY_PROJECT_ID', 'wataesro03')
        self.clarity_token = os.environ.get('CLARITY_API_TOKEN')
        
        # Initialize GA4 Client if credentials exist
        self.ga_client = None
        if os.environ.get('GA4_CLIENT_EMAIL'):
            try:
                # In a real scenario, we'd use service account info from env
                # For now, we assume the environment is configured with GOOGLE_APPLICATION_CREDENTIALS
                self.ga_client = BetaAnalyticsDataClient()
            except Exception as e:
                logger.error(f"Failed to initialize GA4 client: {e}")

    async def get_clarity_insights(self):
        """Fetch insights from Microsoft Clarity Data Export API"""
        if not self.clarity_token:
            return None
            
        url = "https://www.clarity.ms/export-data/api/v1/project-live-insights"
        headers = {"Authorization": f"Bearer {self.clarity_token}"}
        params = {
            "projectId": self.clarity_project_id,
            "numOfDays": 3
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code == 200:
                    return response.json()
                logger.error(f"Clarity API Error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Clarity Request Failed: {e}")
        return None

    def get_ga4_summary(self):
        """Fetch traffic summary from Google Analytics 4"""
        if not self.ga_client or not self.property_id:
            return None
            
        try:
            request = RunReportRequest(
                property=f"properties/{self.property_id}",
                dimensions=[Dimension(name="date")],
                metrics=[
                    Metric(name="activeUsers"),
                    Metric(name="sessions"),
                    Metric(name="screenPageViews")
                ],
                date_ranges=[DateRange(start_date="7daysAgo", end_date="today")],
                order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"))]
            )
            
            response = self.ga_client.run_report(request)
            
            # Format results
            data = []
            for row in response.rows:
                data.append({
                    "date": row.dimension_values[0].value,
                    "users": int(row.metric_values[0].value),
                    "sessions": int(row.metric_values[1].value),
                    "views": int(row.metric_values[2].value)
                })
            return data
        except Exception as e:
            logger.error(f"GA4 Report Failed: {e}")
        return None

    def get_listing_conversions(self, listing_slug=None):
        """Fetch conversion events (clicks) for specific listing or global"""
        if not self.ga_client or not self.property_id:
            return None
            
        # Example logic: pull events like 'directions_click', 'website_click'
        # In a real setup, these would be custom events configured in GA4
        try:
            # Simplified mock logic for this demonstration
            return [
                {"name": "Website Clicks", "value": 1240},
                {"name": "Directions", "value": 850},
                {"name": "Call Button", "value": 420}
            ]
        except Exception as e:
            logger.error(f"Conversion Report Failed: {e}")
        return None
