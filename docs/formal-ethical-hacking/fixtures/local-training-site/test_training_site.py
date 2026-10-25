"""In-process HTML and mocked server-lifecycle checks. Never bind a real listener."""
import io,os,subprocess,sys,unittest
from contextlib import redirect_stdout,redirect_stderr
from pathlib import Path
from unittest.mock import Mock,patch
import training_site as site

class SiteTests(unittest.TestCase):
    def setUp(self):
        self.app=site.TrainingSite();self.addCleanup(self.app.close)
        self.block=patch('training_site.make_server',side_effect=AssertionError('Real binding forbidden in this suite'))
        self.block.start();self.addCleanup(self.block.stop)
    def request(self,path='/',method='GET',query='',**extra):
        observed=[]
        env={'REQUEST_METHOD':method,'PATH_INFO':path,'QUERY_STRING':query,**extra}
        def start(status,headers):observed.append((status,dict(headers)))
        body=b''.join(self.app(env,start));self.assertEqual(len(observed),1)
        return observed[0][0],observed[0][1],body
    def test_home_labels_assumed_identity(self):
        status,headers,body=self.request();self.assertEqual(status,'200 OK')
        self.assertIn(b'TRAINING ONLY',body);self.assertIn(b'No login or authentication',body)
    def test_fixed_relative_links(self):
        body=self.request()[2]
        for path in site.ROUTES:self.assertIn(('href="'+path+'"').encode(),body)
        self.assertNotIn(b'src="http',body);self.assertNotIn(b'href="http',body)
    def test_owner_html(self):
        status,headers,body=self.request('/exercise/own')
        self.assertEqual(status,'200 OK');self.assertIn(b'FICTIONAL own training text',body)
    def test_nonowner_denial_has_no_note(self):
        status,headers,body=self.request('/exercise/other')
        self.assertEqual(status,'404 Not Found');self.assertNotIn(b'FICTIONAL OTHER PRIVATE',body)
    def test_missing_matches_denied(self):
        a=self.request('/exercise/other');b=self.request('/exercise/missing')
        self.assertEqual((a[0],a[2]),(b[0],b[2]))
    def test_html_escaped(self):
        self.app.notes['own']['text']='<script>alert("FICTIONAL")</script>'
        body=self.request('/exercise/own')[2]
        self.assertNotIn(b'<script>',body);self.assertIn(b'&lt;script&gt;',body)
    def test_head_representation_length(self):
        get=self.request('/exercise/own');head=self.request('/exercise/own','HEAD')
        self.assertEqual(head[0],get[0]);self.assertEqual(head[2],b'')
        self.assertEqual(int(head[1]['Content-Length']),len(get[2]))
    def test_post_denied(self):
        status,headers,body=self.request(method='POST');self.assertEqual(status,'405 Method Not Allowed')
        self.assertEqual(headers['Allow'],'GET, HEAD')
    def test_patch_denied(self):self.assertEqual(self.request(method='PATCH')[0],'405 Method Not Allowed')
    def test_query_denied(self):self.assertEqual(self.request(query='role=teacher')[0],'400 Bad Request')
    def test_unlisted_path(self):self.assertEqual(self.request('/unlisted')[0],'404 Not Found')
    def test_header_does_not_change_actor(self):
        self.assertEqual(self.request('/exercise/other',HTTP_X_USER='fictional-learner-b',HTTP_X_ROLE='instructor')[0],'404 Not Found')
    def test_selected_response_headers(self):
        headers=self.request()[1]
        self.assertEqual(headers['Cache-Control'],'no-store');self.assertEqual(headers['X-Content-Type-Options'],'nosniff')
        self.assertIn("default-src 'none'",headers['Content-Security-Policy'])
    def test_budget(self):
        for _ in range(site.MAX_REQUESTS):self.assertEqual(self.request()[0],'200 OK')
        self.assertEqual(self.request()[0],'429 Too Many Requests')
    def test_closed(self):
        self.app.close();self.assertEqual(self.request()[0],'503 Service Unavailable');self.assertEqual(self.app.notes,{})
    def test_new_instance_resets(self):
        self.app.requests=20;self.app.notes['own']['text']='FICTIONAL changed in test'
        fresh=site.TrainingSite();self.addCleanup(fresh.close)
        self.assertEqual(fresh.requests,0);self.assertEqual(fresh.notes['own']['text'],'FICTIONAL own training text')
    def test_root_gate_before_bind(self):
        with patch('training_site.os.name','posix'),patch('training_site.os.geteuid',return_value=0),patch('training_site.make_server') as bind:
            with self.assertRaises(RuntimeError):site.run_local()
            bind.assert_not_called()
    def test_nonposix_gate(self):
        with patch('training_site.os.name','nt'):
            with self.assertRaises(RuntimeError):site.require_runtime()
    def test_ordinary_user_gate_mocked(self):
        with patch('training_site.os.name','posix'),patch('training_site.os.geteuid',return_value=1000):site.require_runtime()
    def test_extra_arguments_before_bind(self):
        with patch('training_site.sys.argv',['training_site.py','extra']),patch('training_site.run_local') as run,redirect_stderr(io.StringIO()):
            self.assertEqual(site.main(),2);run.assert_not_called()
    def test_fixed_bind_and_cleanup_mocked(self):
        server=Mock();server.server_address=('127.0.0.1',54321);server.serve_forever.side_effect=KeyboardInterrupt
        with patch('training_site.require_runtime'),patch('training_site.make_server',return_value=server) as bind,patch('training_site.TrainingSite',return_value=self.app),redirect_stdout(io.StringIO()):
            self.assertEqual(site.run_local(),0)
            self.assertEqual(bind.call_args.args[:2],('127.0.0.1',0))
        server.server_close.assert_called_once();self.assertTrue(self.app.closed)
    def test_unexpected_bind_closes_mocked(self):
        server=Mock();server.server_address=('0.0.0.0',54321)
        with patch('training_site.require_runtime'),patch('training_site.make_server',return_value=server),patch('training_site.TrainingSite',return_value=self.app):
            with self.assertRaises(RuntimeError):site.run_local()
        server.server_close.assert_called_once();self.assertTrue(self.app.closed)
    def test_startup_failure_closes_app_mocked(self):
        with patch('training_site.require_runtime'),patch('training_site.make_server',side_effect=OSError('FICTIONAL')),patch('training_site.TrainingSite',return_value=self.app):
            with self.assertRaises(OSError):site.run_local()
        self.assertTrue(self.app.closed)
    def test_bad_runtime_is_blocked_by_main(self):
        with patch('training_site.sys.argv',['training_site.py']),patch('training_site.require_runtime',side_effect=RuntimeError('FICTIONAL')),redirect_stderr(io.StringIO()):
            self.assertEqual(site.main(),2)
    @unittest.skipUnless(getattr(os,'geteuid',lambda:-1)()==0,'Actual root-rejection CLI case only')
    def test_actual_root_cli_rejects(self):
        with __import__('tempfile').TemporaryDirectory() as work:
            script=Path(__file__).with_name('training_site.py').resolve()
            result=subprocess.run([sys.executable,'-B',str(script)],cwd=work,capture_output=True,text=True,timeout=5)
        self.assertEqual(result.returncode,2);self.assertEqual(result.stdout,'')
        self.assertEqual(result.stderr.strip(),'Training site blocked; use the approved setup/support route')

if __name__=='__main__':unittest.main()
