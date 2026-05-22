let currentURL = window.location.href;
let l = currentURL.length;
let i = 0;

//O(n)
for(i = 0; i < l-2; i++){
  if(currentURL[i] === ':' && currentURL[i+1] === '/' && currentURL[i+2] === '/'){
    break;
  }
}

if(i === l-2){
  throw new Error("url has no scheme\n");
}

let domain_start = i+3;
//O(n) for length
for(i = domain_start; i < l; i++){
  if (currentURL[i] === '/' || currentURL[i] === ':')
    break;
}
//domain_end is either the end of the URL or at index of first / or : after scheme
let domain_end = i;
let domain = currentURL.substring(domain_start,domain_end);
