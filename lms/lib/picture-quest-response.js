// A verified answer can be shown before the authoritative reward ledger finishes.
// Never treat that early frame as a score or as permission to advance.
export async function readQuestResponse(response,onVerified=()=>{}){
 if(!response.ok||!response.headers.get('content-type')?.includes('application/x-ndjson'))return response.json();
 const reader=response.body.getReader(),decoder=new TextDecoder();let pending='',result,finished=false;
 const consume=line=>{if(!line.trim())return;const event=JSON.parse(line);if(event.type==='verified')onVerified(event.data);else if(event.type==='result'){result=event.data;finished=true}else if(event.type==='error')throw Error(event.error)};
 try{while(true){const{done,value}=await reader.read();pending+=decoder.decode(value,{stream:!done});let end;while((end=pending.indexOf('\n'))>=0){consume(pending.slice(0,end));pending=pending.slice(end+1)}if(done)break}if(pending)consume(pending);if(!finished)throw Error('تعذّر تأكيد الحفظ. أعد الضغط على إجابتك.');return result}finally{reader.releaseLock()}
}
