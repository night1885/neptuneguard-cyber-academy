"""Managed, self-owned native observations only. No configurable network target."""
import argparse
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler,HTTPServer
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import xml.etree.ElementTree as ET

BODY=b"NeptuneGuard owned training service\n"

class Handler(BaseHTTPRequestHandler):
    protocol_version="HTTP/1.0"
    def setup(self):
        super().setup();self.connection.settimeout(2)
    def log_message(self,*args):pass
    def version_string(self):return "NeptuneGuard-managed-training"
    def reply(self):
        status=200 if self.path=="/" else 404
        body=BODY if status==200 else b"not found\n"
        self.send_response(status)
        self.send_header("Content-Length",str(len(body)))
        self.send_header("Content-Type","text/plain; charset=utf-8")
        self.send_header("Connection","close")
        self.end_headers()
        if self.command!="HEAD":self.wfile.write(body)
    do_GET=reply
    do_HEAD=reply

@contextmanager
def owned_service():
    server=HTTPServer(("127.0.0.1",0),Handler)
    worker=threading.Thread(target=lambda:server.serve_forever(poll_interval=0.05),daemon=True)
    worker.start()
    try:yield server
    finally:
        server.shutdown();server.server_close();worker.join(timeout=3)
        if worker.is_alive()or server.socket.fileno()!=-1:raise RuntimeError("cleanup not verified")

def nmap_state(raw,port):
    if type(port)is not int or not 1<=port<=65535 or not isinstance(raw,str)or len(raw)>65536 :raise ValueError("unexpected scan input")
    cleaned=raw.replace("<!DOCTYPE nmaprun>","",1)
    if "<!DOCTYPE"in cleaned.upper()or "<!ENTITY"in cleaned.upper():raise ValueError("unsupported XML declaration")
    try:tree=ET.fromstring(cleaned)
    except ET.ParseError as exc:raise ValueError("invalid scan XML")from exc
    hosts=tree.findall("host");scans=tree.findall("scaninfo")
    if tree.tag!="nmaprun"or len(hosts)!=1 or len(scans)!=1:raise ValueError("unexpected scan scope")
    scan=scans[0]
    if scan.get("type")!="connect"or scan.get("protocol")!="tcp"or scan.get("numservices")!="1"or scan.get("services")!=str(port):raise ValueError("unexpected scan method/ports")
    addresses=hosts[0].findall("address")
    if len(addresses)!=1 or addresses[0].get("addr")!="127.0.0.1"or addresses[0].get("addrtype")!="ipv4":raise ValueError("unexpected scan target")
    ports=hosts[0].findall("ports/port")
    if len(ports)!=1 or ports[0].get("protocol")!="tcp"or ports[0].get("portid")!=str(port):raise ValueError("unexpected port output")
    state=ports[0].find("state")
    if state is None or state.get("state")not in("open","closed","filtered"):raise ValueError("unexpected port state")
    return state.get("state")

def parse_stat(raw):
    left=raw.find("(");right=raw.rfind(")")
    if left<1 or right<=left:raise ValueError("invalid proc stat")
    pid=int(raw[:left].strip());rest=raw[right+1:].split()
    if len(rest)<20 or pid<=0:raise ValueError("truncated proc stat")
    ppid=int(rest[1]);ticks=int(rest[19])
    if ppid<0 or ticks<0:raise ValueError("invalid proc fields")
    return {"pid":pid,"ppid":ppid,"comm":raw[left+1:right],"state":rest[0],"start_ticks":ticks}

def observe_child():
    if sys.platform!="linux"or not Path("/proc/self/stat").exists():return {"executed":False,"reason":"Linux proc route unavailable"}
    child=subprocess.Popen([sys.executable,"-c","import time; time.sleep(8)"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    try:
        record=parse_stat(Path(f"/proc/{child.pid}/stat").read_text())
        if record["pid"]!=child.pid or record["ppid"]!=os.getpid():raise RuntimeError("owned child context mismatch")
        result={"executed":True,"scope":"only the harmless child created here","observation":record,"ticks_per_second":os.sysconf("SC_CLK_TCK"),"utc_conversion_performed":False}
    finally:
        child.terminate()
        try:child.wait(timeout=3)
        except subprocess.TimeoutExpired:child.kill();child.wait(timeout=3)
    result["child_closed"]=child.poll()is not None
    return result

def run_checks(require_all=False):
    curl=shutil.which("curl");nmap=shutil.which("nmap")
    if not curl or(require_all and not nmap):raise RuntimeError("required native tool missing; no fallback target")
    versions={}
    for name,path in(("curl",curl),("nmap",nmap)):
        if path:
            value=subprocess.run([path,"--version"],capture_output=True,text=True,check=True,timeout=5)
            versions[name]=value.stdout.splitlines()[0]
    report={"scope":"only the managed service started by this run","versions":versions,"curl_cases":[],"nmap":{"executed":False,"reason":"not installed"}}
    with tempfile.TemporaryDirectory()as directory:
        with owned_service()as server:
            port=server.server_port;url=f"http://127.0.0.1:{port}"
            for name,method,path,fail,expected in(("root-get","GET","/",False,200),("root-head","HEAD","/",False,200),("missing-normal","GET","/missing",False,404),("missing-fail-with-body","GET","/missing",True,404)):
                body=Path(directory)/"output";headers=Path(directory)/"headers"
                command=[curl,"--disable","--silent","--show-error","--noproxy","*","--proto","=http","--connect-timeout","2","--max-time","4","--dump-header",str(headers),"--output",str(body),"--write-out","%{http_code}"]
                if method=="HEAD":command.append("--head")
                if fail:command.append("--fail-with-body")
                command.append(url+path)
                value=subprocess.run(command,capture_output=True,text=True,timeout=7)
                status=int(value.stdout)
                if status!=expected or value.returncode!=(22 if fail else 0):raise RuntimeError("HTTP/process result mismatch")
                output=body.read_text()
                if name=="root-get"and output!=BODY.decode():raise RuntimeError("root representation mismatch")
                if name.startswith("missing")and output!="not found\n":raise RuntimeError("missing representation mismatch")
                report["curl_cases"].append({"name":name,"command":[x.replace(directory,"<TEMP>")for x in command],"http_status":status,"process_exit":value.returncode,"headers":headers.read_text(),"output":output,"output_kind":"curl HEAD header presentation"if method=="HEAD"else"HTTP response body"})
            if nmap:
                command=[nmap,"-sT","-Pn","-n","--max-retries","1","--host-timeout","10s","-p",str(port),"-oX","-","127.0.0.1"]
                value=subprocess.run(command,capture_output=True,text=True,check=True,timeout=15)
                state=nmap_state(value.stdout,port)
                if state!="open":raise RuntimeError("owned listener not observed open")
                report["nmap"]={"executed":True,"command":command,"state":state,"xml":value.stdout}
        report["managed_listener_closed"]=True
    report["owned_process"]=observe_child()
    if require_all and not report["owned_process"]["executed"]:raise RuntimeError("required Linux demonstration unavailable")
    return report

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("--require-all-tools",action="store_true");args=parser.parse_args()
    print(json.dumps(run_checks(args.require_all_tools),indent=2))
