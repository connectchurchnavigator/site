import os
import re

def update_relationship_categories(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update Church main flow / Quick Church to use relationship_church
    # Search for Select components that are inside Church contexts
    
    # Update the mapping logic in the SelectContent
    # For Church contexts (Main Church flow and Quick Church)
    church_pattern = r'\{(taxonomies\.relationship \|\| \[\])\.map\(r => \('
    content = content.replace('taxonomies.relationship || []', 'taxonomies.relationship_church || []')

    # Now we need to selectively change back some to relationship_pastor
    # specifically for Quick Pastor dialogs or Pastor main flows.
    
    if 'ChurchCreationFlow.js' in file_path:
        # In ChurchCreationFlow, only quickPastor should use relationship_pastor
        # We need to find the Select specifically for quickPastor
        qp_select_pattern = r'(quickPastor\.relationship_to_listing.*?taxonomies\.)relationship_church'
        content = re.sub(qp_select_pattern, r'\1relationship_pastor', content, flags=re.DOTALL)
    
    elif 'PastorCreationFlow2.js' in file_path:
        # In PastorCreationFlow2, the main formData uses relationship_pastor
        # only quickChurch should use relationship_church
        
        # First, change all to relationship_pastor
        content = content.replace('relationship_church', 'relationship_pastor')
        
        # Then change quickChurch back to relationship_church
        qc_select_pattern = r'(quickChurch\.relationship_to_listing.*?taxonomies\.)relationship_pastor'
        content = re.sub(qc_select_pattern, r'\1relationship_church', content, flags=re.DOTALL)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

files = [
    r'd:\church-main\frontend\src\pages\listing\ChurchCreationFlow.js',
    r'd:\church-main\frontend\src\pages\listing\PastorCreationFlow2.js'
]

for f in files:
    if os.path.exists(f):
        update_relationship_categories(f)
        print(f"Updated categories in {f}")
    else:
        print(f"File not found: {f}")
