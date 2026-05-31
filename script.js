
const meetDate=new Date('2026-12-31T18:00:00+05:30');
const quotes=['The universe is made of stories, not atoms.','One day closer.'];
beginBtn.onclick=()=>{intro.style.display='none';main.style.display='block';};
for(let i=0;i<150;i++){let s=document.createElement('div');s.className='star';s.innerHTML='✦';s.style.left=Math.random()*100+'vw';s.style.top=Math.random()*100+'vh';s.onclick=()=>{quoteBox.innerText=quotes[Math.floor(Math.random()*quotes.length)];};stars.appendChild(s);}
const startDate=new Date();
function tick(){let d=meetDate-new Date();if(d<0)return;days.textContent=Math.floor(d/86400000);hours.textContent=Math.floor(d%86400000/3600000);minutes.textContent=Math.floor(d%3600000/60000);seconds.textContent=Math.floor(d%60000/1000);let p=(new Date()-startDate)/(meetDate-startDate);boy.style.left=Math.min(85,p*85)+'%';}
setInterval(tick,1000);tick();
