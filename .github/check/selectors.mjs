// CSS commas inside :is(), :not() or attribute strings are not list separators.
export function splitSelectors(text) {
  const result=[];let start=0,depth=0,quote='',escaped=false;
  for(let i=0;i<text.length;i++){
    const char=text[i];
    if(escaped){escaped=false;continue}
    if(char==='\\'){escaped=true;continue}
    if(quote){if(char===quote)quote='';continue}
    if(char==='"'||char==="'"){quote=char;continue}
    if(char==='('||char==='[')depth++;
    else if(char===')'||char===']')depth--;
    else if(char===','&&depth===0){result.push(text.slice(start,i).trim());start=i+1}
  }
  result.push(text.slice(start).trim());return result.filter(Boolean);
}
