
// Change this
const meetDate = new Date('2026-12-31T18:00:00+05:30');

const quotes = [
 'The universe is made of stories, not atoms.',
 'Maybe we are all stories in the end.',
 'One day closer.',
 'Distance is temporary.'
];

const startDate = new Date();

function updateCountdown(){
 const now = new Date();
 const diff = meetDate - now;

 if(diff <= 0){
   document.getElementById('countdown').innerHTML =
   '💥 The wait is over! ❤️';
   return;
 }

 const d = Math.floor(diff/86400000);
 const h = Math.floor(diff%86400000/3600000);
 const m = Math.floor(diff%3600000/60000);
 const s = Math.floor(diff%60000/1000);

 document.getElementById('countdown').innerHTML =
 `${d}d ${h}h ${m}m ${s}s`;

 const progress =
 (now - startDate)/(meetDate - startDate);

 document.getElementById('boy').style.left =
 `${Math.max(0,Math.min(progress*85,85))}%`;
}

setInterval(updateCountdown,1000);
updateCountdown();

const stars=document.getElementById('stars');

for(let i=0;i<80;i++){
 const star=document.createElement('div');
 star.className='star';
 star.innerHTML='⭐';
 star.style.left=Math.random()*100+'vw';
 star.style.top=Math.random()*100+'vh';

 star.onclick=()=>{
   const box=document.getElementById('quoteBox');
   box.innerText=quotes[Math.floor(Math.random()*quotes.length)];
   box.style.display='block';
   setTimeout(()=>box.style.display='none',3000);
 };

 stars.appendChild(star);
}
