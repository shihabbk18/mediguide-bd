import { execFileSync } from 'node:child_process';
const raw = execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8'});
const credential = Object.fromEntries(raw.trim().split('\n').map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)]}));
const headers={Authorization:`Bearer ${credential.password}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
async function api(path,method='GET',body){const r=await fetch('https://api.github.com'+path,{method,headers,body:body?JSON.stringify(body):undefined});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`${r.status}: ${data.message}`);return data;}
const user=await api('/user');
console.log('Authenticated GitHub account:',user.login);
if(process.argv[2]==='create'){let repo;try{repo=await api(`/repos/${user.login}/mediguide-bd`)}catch{repo=await api('/user/repos','POST',{name:'mediguide-bd',description:'Evidence-grounded bilingual Bangladesh medication administration assistant',private:false,auto_init:false})}console.log('Repository:',repo.html_url);}
if(process.argv[2]==='pages'){try{await api(`/repos/${user.login}/mediguide-bd/pages`,'POST',{build_type:'workflow'})}catch(e){if(!e.message.startsWith('409'))throw e}console.log('Pages enabled');}
if(process.argv[2]==='status'){const runs=await api(`/repos/${user.login}/mediguide-bd/actions/runs?per_page=3`);console.log(JSON.stringify(runs.workflow_runs.map(x=>({id:x.id,status:x.status,conclusion:x.conclusion,url:x.html_url})),null,2));try{const pages=await api(`/repos/${user.login}/mediguide-bd/pages`);console.log('Pages:',pages.html_url,pages.status)}catch(e){console.log(e.message)}}
