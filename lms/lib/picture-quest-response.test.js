import{describe,it,expect,vi}from'vitest';
import{readQuestResponse}from'./picture-quest-response';
const encoder=new TextEncoder();
describe('early verified answers',()=>{
 it('delivers verification before the final reward arrives, across split chunks',async()=>{let stream;const onVerified=vi.fn(),response=new Response(new ReadableStream({start(c){stream=c}}),{headers:{'Content-Type':'application/x-ndjson'}});const result=readQuestResponse(response,onVerified);stream.enqueue(encoder.encode('{"type":"veri'));stream.enqueue(encoder.encode('fied","data":{"right":true,"word":"قِطٌّ"}}\n'));await new Promise(r=>setTimeout(r,0));expect(onVerified).toHaveBeenCalledWith({right:true,word:'قِطٌّ'});stream.enqueue(encoder.encode('{"type":"result","data":{"right":true,"points":45}}\n'));stream.close();expect(await result).toEqual({right:true,points:45})});
 it('does not treat early verification alone as a saved score',async()=>{const response=new Response('{"type":"verified","data":{"right":true}}\n',{headers:{'Content-Type':'application/x-ndjson'}});await expect(readQuestResponse(response)).rejects.toThrow('تأكيد الحفظ')});
 it('surfaces a reward failure and supports existing JSON responses',async()=>{await expect(readQuestResponse(new Response('{"type":"error","error":"retry"}\n',{headers:{'Content-Type':'application/x-ndjson'}}))).rejects.toThrow('retry');expect(await readQuestResponse(Response.json({right:false,points:0}))).toEqual({right:false,points:0})});
});
