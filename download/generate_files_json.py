import os
import json
from datetime import datetime

# ========== 配置 ==========
download_dir = os.path.dirname(os.path.abspath(__file__))
images_dir = os.path.normpath(os.path.join(download_dir, '..', 'images'))
exclude_filenames = {'index.html', 'index - 副本.html', 'files.json', 'update_files_json.py', 'generate_files_json.py'}
json_path = os.path.join(download_dir, 'files.json')

def normalize_key(url):
    """将 url 转换为统一的 key（去掉开头的 './'，并修正 images 路径）"""
    if url.startswith('./'):
        url = url[2:]
    if url.startswith('images/'):
        url = '../' + url
    return url

# ========== 加载现有 JSON 并迁移 ==========
existing = {}
migrated = False
if os.path.exists(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        old_list = json.load(f)
    print(f"已加载现有 JSON，共 {len(old_list)} 条记录。")
    for item in old_list:
        old_url = item.get('url', '')
        key = normalize_key(old_url)
        if old_url.startswith('./images/'):
            item['url'] = old_url.replace('./images/', '../images/', 1)
            migrated = True
        existing[key] = item
    if migrated:
        print("已自动迁移旧格式的 images 路径（./images/ -> ../images/）。")
else:
    print("未找到现有 files.json，将创建新文件。")

# ========== 扫描 download 目录 ==========
def scan_download_dir():
    result = {}
    for root, dirs, files in os.walk(download_dir):
        for file in files:
            if file in exclude_filenames:
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, download_dir).replace(os.sep, '/')
            key = rel_path
            stat = os.stat(full_path)
            item = {
                "name": file,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                "url": './' + rel_path,
                "ext": file.split('.')[-1].lower() if '.' in file else ''
            }
            result[key] = item
    return result

# ========== 扫描 images 目录 ==========
def scan_images_dir():
    result = {}
    if not os.path.exists(images_dir):
        print(f"警告: images 目录不存在 ({images_dir})，跳过扫描。")
        return result
    for root, dirs, files in os.walk(images_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_to_download = os.path.relpath(full_path, download_dir).replace(os.sep, '/')
            if not rel_to_download.startswith('../'):
                rel_to_download = '../' + rel_to_download
            key = rel_to_download
            stat = os.stat(full_path)
            item = {
                "name": file,
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                "url": './' + rel_to_download,
                "ext": file.split('.')[-1].lower() if '.' in file else ''
            }
            result[key] = item
    return result

print("正在扫描 download 目录...")
download_files = scan_download_dir()
print(f"download 目录找到 {len(download_files)} 个文件。")

print("正在扫描 images 目录...")
images_files = scan_images_dir()
print(f"images 目录找到 {len(images_files)} 个文件。")

all_scanned = {**download_files, **images_files}
print(f"总计扫描到 {len(all_scanned)} 个文件。")

# ========== 识别新增、删除、更新 ==========
new_files = {}
updated_files = {}
deleted_paths = []

for key, new_item in all_scanned.items():
    if key in existing:
        old_item = existing[key]
        if (old_item.get('size') != new_item['size'] or 
            old_item.get('modified') != new_item['modified']):
            updated_item = new_item.copy()
            if 'protected' in old_item:
                updated_item['protected'] = old_item['protected']
            if 'password' in old_item:
                updated_item['password'] = old_item['password']
            updated_files[key] = updated_item
        else:
            updated_files[key] = old_item
    else:
        new_files[key] = new_item

for key in existing:
    if key not in all_scanned:
        deleted_paths.append(key)

# ========== 输出变化信息 ==========
if deleted_paths:
    print(f"\n以下 {len(deleted_paths)} 个文件已从磁盘删除，将从 JSON 中移除：")
    for p in deleted_paths:
        print(f"  - {p}")

if updated_files:
    changed = [k for k in updated_files if k in existing and existing[k].get('size') != all_scanned[k]['size']]
    if changed:
        print(f"\n以下 {len(changed)} 个文件内容已更新（将保留原有密码保护设置）：")
        for p in changed:
            print(f"  - {p}")

if new_files:
    print(f"\n发现 {len(new_files)} 个新文件：")
    for p in new_files:
        print(f"{p},")
    
    encrypt_choice = input("\n是否需要对其中某些文件加密？(y/n): ").strip().lower()
    password = ""
    if encrypt_choice == 'y':
        print("请输入需要加密的文件名（多个用英文逗号分隔，例如：17.xls,19.xls）")
        names_input = input().strip()
        encrypt_names = [n.strip() for n in names_input.split(',')] if names_input else []
        if encrypt_names:
            password = input("请输入这些文件的下载密码：").strip()
            for key, item in new_files.items():
                if item['name'] in encrypt_names:
                    item['protected'] = True
                    item['password'] = password
                else:
                    item['protected'] = False
        else:
            for item in new_files.values():
                item['protected'] = False
    else:
        for item in new_files.values():
            item['protected'] = False

    for key, item in new_files.items():
        updated_files[key] = item
else:
    print("\n没有发现新文件。")

# ========== 构建最终文件列表（按修改时间升序：新的放后面） ==========
final_list = []
for key, item in updated_files.items():
    if 'protected' not in item:
        item['protected'] = False
    final_list.append(item)

# 按 modified 升序（旧的在前，新的在后），若时间相同则按文件名升序
final_list.sort(key=lambda x: (x['modified'], x['name']))

# ========== 写入 JSON ==========
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(final_list, f, ensure_ascii=False, indent=2)

print(f"\n已更新 {json_path}，共 {len(final_list)} 个文件。")
print("操作完成。")