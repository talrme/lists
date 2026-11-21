// Keep this one-minute guide aligned with scheduling, gestures and sync behavior.
export function guideMarkup(){
 return `<article class="quick-guide" aria-label="Lists quick guide">
 <p class="guide-intro">The basics, in about a minute.</p>
 <section><h3>Add and schedule</h3><div class="guide-buckets" aria-hidden="true"><span>Today</span><span>Week</span><span>Later</span></div><p>Type, then tap a list to add without navigating away. Enter uses the current list; the double-chevron opens details.</p><p>Today keeps due/overdue tasks. Week shows five future business days; Later holds undated or farther-out tasks. Adding to Week chooses among five weekdays, including today when eligible.</p></section>
 <section><h3>Move and undo</h3><div class="guide-gestures" aria-hidden="true"><span><i data-lucide="arrow-right"></i>Punt to Week</span><span><i data-lucide="arrow-left"></i>Week → Today</span></div><p>Swipe right in Today to punt into Week. Swipe right in Later, or swipe left in Week, to move to Today. Hold briefly to drag. Tap Undo after accidental completion or punting.</p></section>
 <section><h3>Private, shared, waiting</h3><p>Tasks start private. Details lets you share and assign them. Menu circles filter owners. Waiting uses its follow-up date; it remains a status within your lists.</p></section>
 <section><h3>Ideas and tags</h3><p>Enable Someday / Maybe in To-do settings. Hiding it keeps its items; it never feeds daily suggestions. Add tags in details; tap tags to search. Manage tags in Settings. Personal names stay private; Household tags are shared.</p><p>Desktop has optional side-by-side columns. Colors, style, enabled lists and owner filters sync across your devices.</p></section>
 <section><h3>Working quietly</h3><p>Show N days expands Today; Show today only collapses it. From Later adds one daily suggestion; completing or punting it uses that day’s pick.</p><p>After an online visit, edits work offline and upload when you reconnect with Lists open. Software updates protect unfinished edits.</p></section>
 <div class="modal-footer"><button class="primary" data-close>Got it</button></div></article>`;
}
