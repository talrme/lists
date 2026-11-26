import {taskOrder} from './core.js?v=organizer1';

export function carriedOver(task,today){
 const date=task.waiting?task.followUp:task.dueDate;
 return task.category==='todo'&&!task.completed&&!task.someday&&!!date&&date<today;
}

export function todayOrder(a,b,today){
 return Number(carriedOver(b,today))-Number(carriedOver(a,today))||taskOrder(a,b);
}
