import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()

    # Remove duplicate }).join(''); inside renderHeaderGiftsShowcase
    old_broken = "        }).join('');\n    }).join('');"
    new_fixed = "        }).join('');"

    if old_broken in text:
        text = text.replace(old_broken, new_fixed)
        print(f"Fixed duplicate join in {filepath}")
    else:
        print(f"Duplicate join pattern not found in {filepath}, checking regex...")
        text = re.sub(r"(\}\)\.join\(''\);\s*)\}\)\.join\(''\);", r"\1", text)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

fix_file(r'c:\Users\пк\Desktop\ОСНОВААА\v1.3\profile.html')
fix_file(r'c:\Users\пк\Desktop\ОСНОВААА\profile.html')
