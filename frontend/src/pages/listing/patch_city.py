fpath = r'd:\church-main\frontend\src\pages\listing\ChurchCreationFlow.js'
content = open(fpath, 'r', encoding='utf-8').read()

# The church marker uses 3-space indent (not 4)
church_marker = (
    '                        <div className="space-y-2">\n'
    '                           <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-500">How are you related to this listing? (Optional)</Label>\n'
)
church_insert = (
    '                        <div className="space-y-2">\n'
    '                           <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-500">Search City *</Label>\n'
    '                           <p className="text-[10px] text-gray-400 -mt-1 mb-1">The city where seekers will find this church in the directory</p>\n'
    '                           <Input placeholder="e.g. Hyderabad, Dallas..." value={quickChurch.city} onChange={(e) => setQuickChurch({ ...quickChurch, city: e.target.value })} className={inputStyle} />\n'
    '                        </div>\n'
    '                        <div className="space-y-2">\n'
    '                           <Label className="text-[12px] font-medium tracking-widest uppercase text-gray-500">How are you related to this listing? (Optional)</Label>\n'
)

if church_marker in content:
    content = content.replace(church_marker, church_insert, 1)
    print('Church city block inserted OK')
else:
    print('ERROR: Church marker not found')

open(fpath, 'w', encoding='utf-8').write(content)
print('Done.')
