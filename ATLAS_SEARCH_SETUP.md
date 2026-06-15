# MongoDB Atlas Search Setup

## IMPORTANT: Text Index Creation (Required for Search)

To enable fast search on ChurchNavigator, you MUST create text indexes on MongoDB Atlas.

### Step 1: Access MongoDB Atlas
1. Go to https://cloud.mongodb.com/
2. Select your cluster (DEV-ChurchNavigator for dev, ChurchNavigator for prod)
3. Click "Browse Collections"

### Step 2: Create Text Indexes

For EACH collection (churches, events, pastors, worship_leaders, media_teams, bible_colleges):

1. Click on the collection name
2. Click "Indexes" tab
3. Click "Create Index"
4. Use this index definition:

```json
{
  "name": "text",
  "description": "text",
  "city": "text",
  "denomination": "text",
  "tags": "text"
}
```

5. Index options:
   - Type: Text
   - Name: search_text
   - Background: Yes

6. Click "Create Index"

### Step 3: Verify Indexes

Run this in MongoDB Compass or Atlas UI:

```javascript
db.churches.getIndexes()
```

You should see a text index listed.

### Step 4: Test Search

Test the search endpoint:

```bash
curl "https://api.churchnavigator.com/api/search?q=pentecostal+london"
```

Should return results instantly (<200ms).

## Optional: Atlas Search (Enhanced Features)

For fuzzy search, autocomplete, and advanced features (free on M0+ clusters):

1. Go to Atlas cluster → Search tab
2. Click "Create Search Index"
3. Select "JSON Editor"
4. Use this configuration:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "description": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "city": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "denomination": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "tags": {
        "type": "string",
        "analyzer": "lucene.standard"
      }
    }
  }
}
```

5. Repeat for all collections

Note: Text indexes work fine for basic search. Atlas Search indexes are optional enhancements.

## Performance Expectations

- Text index search: 100-200ms response time
- Atlas Search: 50-100ms response time
- Zero API costs (all search happens on MongoDB)
- Claude AI: Only used for conversational queries (rate-limited to 20/day)

## Troubleshooting

If search returns no results:
1. Verify text indexes exist on all collections
2. Check moderation_status field is set to "approved" on documents
3. Ensure MONGODB_URI env var is correct
4. Check Railway logs for errors
