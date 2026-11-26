export const defaultColumnOrder=['today','upcoming','waiting','later','someday'];

export function normalizeColumnOrder(value){
 return [...new Set([...(Array.isArray(value)?value:[]),...defaultColumnOrder])].filter(lane=>defaultColumnOrder.includes(lane));
}

export function visibleColumnOrder(value,{merged=false,someday=false}={}){
 return [...new Set(normalizeColumnOrder(value).filter(lane=>someday||lane!=='someday').map(lane=>merged&&lane==='upcoming'?'today':lane))];
}
