# MongoDB Atlas Search Setup for ChurchNavigator

## AUTOMATIC TEXT INDEX (Already Created)
The backend automatically creates a text index on startup:
- Fields: name, description, city, denomination
- This enables basic search with $text operator
- No manual action required ✅

## OPTIONAL: Atlas Search Index (Enhanced Fuzzy Search)
For better search quality (typo tolerance, relevance scoring), create an Atlas Search index:

### Steps:
1. Go to MongoDB Atlas → your cluster → Search tab
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
        "analyzer": "lucene.english"
      },
      "description": {
        "type": "string",
        "analyzer": "lucene.english"
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
        "analyzer": "lucene.english"
      }
    }
  }
}
```

5. Name it: `default`
6. Collection: `listings`
7. Click "Create Search Index"

### When to Use:
- Text index (current): Fast, free, good for exact matches
- Atlas Search: Better for typos, synonyms, fuzzy matching
- Both work on M0 free tier

### Backend Support:
The code automatically uses Atlas Search if available, falls back to text index if not.
No code changes needed.

## Performance:
- Text search: ~50-100ms
- Atlas Search: ~100-200ms
- Claude AI: ~2000-5000ms (now optional only)

## Cost:
- Text index: FREE ✅
- Atlas Search: FREE on M0 ✅
- Conversational AI: Rate limited to 20/day (minimal cost)
