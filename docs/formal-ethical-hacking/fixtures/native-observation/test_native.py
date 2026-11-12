import http.client
import unittest
from verify_native import BODY,owned_service,nmap_state,parse_stat

class NativeTests(unittest.TestCase):
    def xml(self,host="127.0.0.1",port=123,state="open"):
        return f'<nmaprun><scaninfo type="connect" protocol="tcp" numservices="1" services="{port}"/><host><address addr="{host}" addrtype="ipv4"/><ports><port protocol="tcp" portid="{port}"><state state="{state}"/></port></ports></host></nmaprun>'
    def test_xml_open_synthetic(self):self.assertEqual(nmap_state(self.xml(),123),"open")
    def test_nmap_standard_doctype_synthetic(self):self.assertEqual(nmap_state('<?xml version="1.0"?><!DOCTYPE nmaprun>'+self.xml(),123),"open")
    def test_xml_closed_synthetic(self):self.assertEqual(nmap_state(self.xml(state="closed"),123),"closed")
    def test_xml_filtered_synthetic(self):self.assertEqual(nmap_state(self.xml(state="filtered"),123),"filtered")
    def test_wrong_target_rejected(self):
        with self.assertRaises(ValueError):nmap_state(self.xml(host="192.0.2.1"),123)
    def test_wrong_port_rejected(self):
        with self.assertRaises(ValueError):nmap_state(self.xml(port=124),123)
    def test_bool_port_rejected(self):
        with self.assertRaises(ValueError):nmap_state(self.xml(),True)
    def test_malformed_xml_rejected(self):
        with self.assertRaises(ValueError):nmap_state("<nmaprun",123)
    def test_doctype_rejected(self):
        with self.assertRaises(ValueError):nmap_state("<!DOCTYPE x>"+self.xml(),123)
    def test_extra_host_rejected(self):
        value=self.xml().replace("</nmaprun>","<host/></nmaprun>")
        with self.assertRaises(ValueError):nmap_state(value,123)
    def test_extra_port_rejected(self):
        value=self.xml().replace("</ports>",'<port portid="124" protocol="tcp"/></ports>')
        with self.assertRaises(ValueError):nmap_state(value,123)
    def test_wrong_scan_type(self):
        with self.assertRaises(ValueError):nmap_state(self.xml().replace('type="connect"','type="syn"'),123)
    def test_proc_spaces_parentheses(self):
        fields=["S","12"]+["0"]*17+["987"]
        result=parse_stat("123 (training name (x)) "+" ".join(fields))
        self.assertEqual((result["pid"],result["ppid"],result["start_ticks"],result["comm"]),(123,12,987,"training name (x)"))
    def test_proc_truncated(self):
        with self.assertRaises(ValueError):parse_stat("123 (name) S 12")
    def request(self,server,method,path):
        client=http.client.HTTPConnection("127.0.0.1",server.server_port,timeout=3)
        try:
            client.request(method,path);response=client.getresponse();return response.status,dict(response.getheaders()),response.read()
        finally:client.close()
    def test_real_owned_get(self):
        with owned_service()as server:self.assertEqual(self.request(server,"GET","/")[2],BODY)
    def test_real_owned_head(self):
        with owned_service()as server:
            status,headers,body=self.request(server,"HEAD","/");self.assertEqual(status,200);self.assertEqual(body,b"");self.assertEqual(int(headers["Content-Length"]),len(BODY))
    def test_real_owned_missing(self):
        with owned_service()as server:self.assertEqual(self.request(server,"GET","/missing")[0],404)
    def test_bound_loopback_only(self):
        with owned_service()as server:self.assertEqual(server.server_address[0],"127.0.0.1")
    def test_cleanup(self):
        with owned_service()as server:pass
        self.assertEqual(server.socket.fileno(),-1)

if __name__=="__main__":unittest.main()
