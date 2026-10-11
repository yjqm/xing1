#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
手机访问助手：检测本机可访问地址，生成二维码页面并在浏览器打开。
用法：双击 phone-url.bat，或 python phone-url.py [端口]
"""
import base64
import io
import json
import os
import socket
import subprocess
import sys
import urllib.request
import webbrowser

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_HTML = os.path.join(HERE, "phone-access.html")

# 虚拟网卡 / VPN，不作为手机访问首选
VIRTUAL_KEYWORDS = (
    "vmware", "vmnet", "virtualbox", "hyper-v", "default switch",
    "wsl", "docker", "radmin", "tailscale", "zerotier", "loopback",
    "tunnel", "tap-", "npcap", "sangfor", "easyconnect",
)


def probe_once(cmd):
    try:
        r = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", cmd],
            capture_output=True, timeout=25,
        )
        txt = r.stdout.decode("utf-8", errors="ignore") or r.stdout.decode("gbk", errors="ignore")
        return txt
    except Exception:
        return ""


def list_ipv4():
    """返回 [(ip, alias, ifindex)]"""
    cmd = (
        "$ErrorActionPreference='SilentlyContinue';"
        "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;"
        "Get-NetIPAddress -AddressFamily IPv4 | "
        "Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' } | "
        "Select-Object IPAddress, InterfaceAlias, InterfaceIndex | ConvertTo-Json -Compress"
    )
    txt = probe_once(cmd)
    out = []
    if not txt.strip():
        return out
    try:
        data = json.loads(txt)
        if isinstance(data, dict):
            data = [data]
        for d in data:
            out.append((d.get("IPAddress"), d.get("InterfaceAlias", ""), d.get("InterfaceIndex")))
    except Exception:
        for line in txt.splitlines():
            parts = [p.strip() for p in line.split("|") if p.strip()]
            if len(parts) >= 2 and parts[0].count(".") == 3:
                out.append((parts[0], parts[1] if len(parts) > 1 else "", None))
    return [x for x in out if x[0]]


def default_outbound_ip():
    """通过路由表推断出口 IP（不实际发包）"""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("223.5.5.5", 80))
        return s.getsockname()[0]
    except Exception:
        return None
    finally:
        s.close()


def service_up(ip, port=PORT, timeout=2.5):
    try:
        req = urllib.request.Request(
            f"http://{ip}:{port}/api/health",
            headers={"User-Agent": "phone-url-helper"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status == 200
    except Exception:
        return False


def make_qr_b64(url):
    try:
        import qrcode
        img = qrcode.make(url)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode()
    except Exception as e:
        print(f"  [提示] 二维码生成失败（{e}），页面将只显示文字地址")
        return ""


def build_html(url, b64, candidates):
    rows = "".join(
        f'<tr><td>{label}</td><td class="mono">{ip}:{PORT}</td><td class="{"ok" if ok else "bad"}">'
        f'{"可访问" if ok else "不通"}</td></tr>'
        for label, ip, ok in candidates
    )
    qr_block = (
        f'<div class="qr"><img src="data:image/png;base64,{b64}" alt="扫码访问"></div>' if b64 else ""
    )
    return f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>手机访问 · 互动教学平台</title>
<style>
*{{box-sizing:border-box}}
body{{margin:0;padding:28px 18px 44px;font-family:-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;
background:#f6f7fb;color:#1a1d26;line-height:1.6}}
.wrap{{max-width:660px;margin:0 auto}}
h1{{font-size:21px;margin:0 0 6px}}
.sub{{color:#6b7280;font-size:14px;margin-bottom:18px}}
.card{{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:22px;margin-bottom:14px;
box-shadow:0 1px 3px rgba(16,24,40,.05)}}
.qrrow{{display:flex;gap:22px;align-items:center;flex-wrap:wrap}}
.qr{{width:170px;height:170px;flex:0 0 auto;border:1px solid #eef0f4;border-radius:10px;padding:7px;background:#fff}}
.qr img{{width:100%;height:100%;display:block}}
.urlbox{{flex:1 1 230px;min-width:210px}}
.url{{font-family:ui-monospace,Consolas,monospace;font-size:18px;font-weight:600;background:#f3f4f6;
border:1px solid #e5e7eb;border-radius:8px;padding:11px 13px;word-break:break-all}}
.copy{{margin-top:9px;padding:7px 15px;font-size:13px;border:1px solid #d1d5db;background:#fff;border-radius:8px;cursor:pointer}}
h2{{font-size:15px;margin:0 0 10px;color:#111827}}
ol{{margin:0;padding-left:20px;font-size:14px;color:#374151}}li{{margin-bottom:6px}}
code{{background:#f3f4f6;padding:1px 6px;border-radius:4px;font-size:13px}}
table{{width:100%;border-collapse:collapse;font-size:14px}}
td{{padding:7px 0;border-bottom:1px solid #f0f1f4}}
td:first-child{{color:#6b7280;width:120px}}
.mono{{font-family:ui-monospace,Consolas,monospace}}
.ok{{color:#047857;font-size:13px}}.bad{{color:#9ca3af;font-size:13px}}
.tag{{display:inline-block;background:#ecfdf5;color:#047857;font-size:12px;padding:3px 10px;border-radius:99px;margin-bottom:14px}}
.tag.off{{background:#fef2f2;color:#b91c1c}}
</style></head><body><div class="wrap">
<h1>手机访问地址</h1>
<div class="sub">手机连同一个 WiFi，或让电脑连你的手机热点，扫码即可打开。</div>
<div class="tag">● 服务运行中 · 端口 {PORT}</div>
<div class="card"><div class="qrrow">
{qr_block}
<div class="urlbox"><div class="url" id="u">{url}</div>
<button class="copy" onclick="navigator.clipboard.writeText(document.getElementById('u').textContent).then(()=>{{this.textContent='已复制 ✓';setTimeout(()=>this.textContent='复制地址',1500)}})">复制地址</button>
</div></div></div>
<div class="card"><h2>用手机热点时的步骤</h2><ol>
<li>手机打开「个人热点」，电脑连上这个热点。</li>
<li>电脑重新运行 <code>phone-url.bat</code>，页面会刷新成热点网段的新地址。</li>
<li>手机用浏览器打开新地址（热点下手机自身一般是网关，如 <code>192.168.43.1</code>）。</li>
<li>若电脑把热点识别成「公用网络」而连不上，在 Windows 设置里把该网络改成「专用」。</li>
</ol></div>
<div class="card"><h2>全部候选地址</h2><table>{rows}</table></div>
<div class="card"><h2>登录账号</h2><table>
<tr><td>管理员</td><td class="mono">admin / 〈本机管理员密码〉</td><td></td></tr>
<tr><td>学生</td><td>手机打开后直接注册</td><td></td></tr></table></div>
</div></body></html>"""


def main():
    print("=" * 52)
    print("  手机访问地址助手")
    print("=" * 52)

    if not service_up("127.0.0.1"):
        print(f"\n[×] 本机 {PORT} 端口没有服务在跑。")
        print("    请先双击 start-local.bat 启动平台，再运行本工具。\n")
        return 1

    print(f"\n[√] 服务已在 {PORT} 端口运行")

    ips = list_ipv4()
    if not ips:
        print("[×] 没能取到网络地址")
        return 1

    preferred = default_outbound_ip()
    print(f"[√] 当前上网出口 IP：{preferred or '未知'}（手机热点下即热点网段）\n")

    # 排序：出口 IP 优先，其次非虚拟网卡
    def rank(item):
        ip, alias, _ = item
        virt = any(k in alias.lower() for k in VIRTUAL_KEYWORDS)
        return (0 if ip == preferred else 1, 1 if virt else 0, alias)

    ips.sort(key=rank)

    candidates = []
    reachable = []
    print("  检测各地址连通性：")
    for ip, alias, _ in ips:
        ok = service_up(ip)
        candidates.append((alias or "网络", ip, ok))
        if ok:
            reachable.append(ip)
        virt = "（虚拟网卡）" if any(k in alias.lower() for k in VIRTUAL_KEYWORDS) else ""
        print(f"    {'√' if ok else '×'}  {ip:>16}   {alias}{virt}")

    if not reachable:
        print("\n[×] 没有任何地址能访问到服务，可能被防火墙拦了。\n")
        return 1

    # 首选：出口 IP（若在可达列表里），否则第一个可达的非虚拟地址
    if preferred in reachable:
        target = preferred
    else:
        target = reachable[0]
    url = f"http://{target}:{PORT}/"

    print("\n" + "-" * 52)
    print(f"  手机打开：{url}")
    print("-" * 52)

    b64 = make_qr_b64(url)
    html = build_html(url, b64, candidates)
    with open(OUT_HTML, "w", encoding="utf-8") as f:
        f.write(html)

    try:
        webbrowser.open(OUT_HTML)
        print("\n[√] 已在浏览器打开扫码页面")
    except Exception:
        pass
    print(f"[√] 页面文件：{OUT_HTML}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
