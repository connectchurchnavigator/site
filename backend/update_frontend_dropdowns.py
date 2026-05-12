import os
import re

def update_relationship_field(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pattern for the main GMBRow or Label + Input
    # Match GMBRow label="How are you related..." and the Input inside it
    pattern1 = r'(<GMBRow label="How are you related to this listing\? \(Optional\)">\s*)<Input.*?relationship_to_listing.*?/>(\s*</GMBRow>)'
    
    # Replacement for pattern 1 (Main flow / Dialogs)
    replacement1 = r'''\1<Select
                                                 value={formData.relationship_to_listing}
                                                 onValueChange={(v) => updateFormData('relationship_to_listing', v)}
                                              >
                                                 <SelectTrigger className={inputStyle}>
                                                    <SelectValue placeholder="Select your relationship" />
                                                 </SelectTrigger>
                                                 <SelectContent className="z-[110]">
                                                    {(taxonomies.relationship || []).map(r => (
                                                       <SelectItem key={r} value={r}>{r}</SelectItem>
                                                    ))}
                                                 </SelectContent>
                                              </Select>\2'''

    # Pattern for quickPastor (uses setQuickPastor)
    pattern_qp = r'(<Label[^>]*?>How are you related to this listing\? \(Optional\)</Label>\s*)<Input.*?quickPastor\.relationship_to_listing.*?/>'
    replacement_qp = r'''\1<Select
                                                 value={quickPastor.relationship_to_listing}
                                                 onValueChange={(v) => setQuickPastor(prev => ({ ...prev, relationship_to_listing: v }))}
                                              >
                                                 <SelectTrigger className={cn(selectStyle, "h-12 bg-gray-50/50")}>
                                                    <SelectValue placeholder="Select your relationship" />
                                                 </SelectTrigger>
                                                 <SelectContent className="z-[130]">
                                                    {(taxonomies.relationship || []).map(r => (
                                                       <SelectItem key={r} value={r}>{r}</SelectItem>
                                                    ))}
                                                 </SelectContent>
                                              </Select>'''

    # Pattern for quickChurch (uses setQuickChurch)
    pattern_qc = r'(<Label[^>]*?>How are you related to this listing\? \(Optional\)</Label>\s*)<Input.*?quickChurch\.relationship_to_listing.*?/>'
    replacement_qc = r'''\1<Select
                                value={quickChurch.relationship_to_listing}
                                onValueChange={(v) => setQuickChurch({ ...quickChurch, relationship_to_listing: v })}
                             >
                                <SelectTrigger className={inputStyle}>
                                   <SelectValue placeholder="Select your relationship" />
                                </SelectTrigger>
                                <SelectContent className="z-[130]">
                                   {(taxonomies.relationship || []).map(r => (
                                      <SelectItem key={r} value={r}>{r}</SelectItem>
                                   ))}
                                </SelectContent>
                             </Select>'''

    # Handle the specific case in PastorCreationFlow2 where Label and Input are siblings
    pattern_pastor_main = r'(<Label[^>]*?>How are you related to this listing\? \(Optional\)</Label>\s*)<Input[^>]*?relationship_to_listing[^>]*?/>'

    # Apply replacements
    new_content = re.sub(pattern1, replacement1, content, flags=re.DOTALL)
    new_content = re.sub(pattern_qp, replacement_qp, new_content, flags=re.DOTALL)
    new_content = re.sub(pattern_qc, replacement_qc, new_content, flags=re.DOTALL)
    
    # Fix taxonomies state if needed
    new_content = new_content.replace('useState({})', 'useState({ relationship: [] })')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

files = [
    r'd:\church-main\frontend\src\pages\listing\ChurchCreationFlow.js',
    r'd:\church-main\frontend\src\pages\listing\PastorCreationFlow2.js'
]

for f in files:
    if os.path.exists(f):
        update_relationship_field(f)
        print(f"Updated {f}")
    else:
        print(f"File not found: {f}")
