"""Strip lines that are only triple-backticks from all .html and .py files under templates/ and repo root templates.
This is a safe, idempotent fix to remove accidental Markdown fences that break Flask templates.
"""
import os
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent
templates_dir = repo_root / 'templates'

def strip_file(p: Path):
    changed = False
    try:
        text = p.read_text(encoding='utf-8')
    except Exception:
        return False
    lines = text.splitlines()
    new_lines = []
    for ln in lines:
        # remove lines that are exactly ``` or ```html or ```python etc.
        if ln.strip().startswith('```') and ln.strip().strip('`').strip() == '':
            changed = True
            continue
        if ln.strip() == '```':
            changed = True
            continue
        # also remove lines like ```html
        if ln.strip().startswith('```'):
            # if entire line is triple-backticks plus optional language tag, remove
            if ln.strip().count('`') >= 3 and all(c=='`' for c in ln.strip()[:3]):
                # If line contains other content (unlikely), still remove only if it's fence
                changed = True
                continue
        new_lines.append(ln)
    if changed:
        p.write_text('\n'.join(new_lines) + '\n', encoding='utf-8')
    return changed

changed_files = []
for p in templates_dir.rglob('*.html'):
    if strip_file(p):
        changed_files.append(str(p))

# also strip top-level python files and README that might have fences affecting rendering
for p in repo_root.glob('*.py'):
    strip_file(p)

if changed_files:
    print('Stripped backticks from:', changed_files)
else:
    print('No files needed backtick stripping.')
