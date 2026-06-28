import os
import json
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.normpath(os.path.join(SCRIPT_DIR, '..'))
JSON_PATH = os.path.join(SCRIPT_DIR, 'files.json')
ATTR_PATH = os.path.join(REPO_ROOT, '.gitattributes')


def run_git(args, cwd=None):
    result = subprocess.run(
        ['git'] + args,
        cwd=cwd or REPO_ROOT,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"[ERROR] git {' '.join(args)}: {result.stderr.strip()}")
    return result


def load_files_json():
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def url_to_repo_path(url):
    """将 files.json 中的 url 转为相对于仓库根的路径"""
    if url.startswith('./'):
        url = url[2:]
    return 'download/' + url


def generate_lfs_rules(files):
    """为每个文件生成 LFS 追踪规则，按扩展名去重分组"""
    rules = []
    seen = set()
    for f in files:
        ext = f['ext']
        if not ext or ext in seen:
            continue
        seen.add(ext)
        pattern = f'*.{ext}'
        rules.append(f'{pattern} filter=lfs diff=lfs merge=lfs -text')
    return rules


def update_gitattributes(rules):
    existing_lines = []
    if os.path.exists(ATTR_PATH):
        with open(ATTR_PATH, 'r', encoding='utf-8') as f:
            existing_lines = [l.rstrip('\n') for l in f.readlines()]

    existing_rules = set()
    other_lines = []
    for line in existing_lines:
        stripped = line.strip()
        if 'filter=lfs' in stripped:
            existing_rules.add(stripped)
        elif stripped:
            other_lines.append(stripped)

    new_rules = [r for r in rules if r not in existing_rules]
    if not new_rules:
        print("所有 LFS 规则已存在，无需更新 .gitattributes。")
        return False

    all_lines = other_lines + sorted(existing_rules | set(rules))
    with open(ATTR_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(all_lines) + '\n')
    print(f"已添加 {len(new_rules)} 条新 LFS 规则到 .gitattributes。")
    return True


def main():
    os.chdir(REPO_ROOT)

    files = load_files_json()
    print(f"从 files.json 加载了 {len(files)} 个文件。")

    rules = generate_lfs_rules(files)
    print(f"生成 {len(rules)} 条 LFS 追踪规则。")

    changed = update_gitattributes(rules)

    run_git(['lfs', 'install'])

    if changed:
        run_git(['add', '.gitattributes'])
        run_git(['commit', '-m', 'chore: 更新 Git LFS 追踪规则'])
        print("已提交 .gitattributes。")

    # 添加并提交 download 和 images 目录中的文件
    run_git(['add', 'download/'])
    run_git(['add', 'images/'])

    status = subprocess.run(
        ['git', 'status', '--porcelain'],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True
    )
    if status.stdout.strip():
        run_git(['commit', '-m', 'chore: 通过 LFS 上传资源文件'])
        print("已提交文件。")
        print("正在推送到远程仓库...")
        run_git(['push', 'origin', 'HEAD'])
        print("推送完成。")
    else:
        print("没有需要提交的变更。")


if __name__ == '__main__':
    main()
