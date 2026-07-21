# staplebomb
A web extension that keeps track of how much time you spend viewing websites of different domains.
Current functionalities:
- (Done) Track total time usage across different sessions with chrome.storage.local; Reset tracking with a button; This comes in the form of a stopwatch and updates "live" as you spend time browsing.

- (Done) Track time usage bounded by time period with info sent to IndexedDB(for example, time spent in the last 15 minutes, half hour, full hour, etc). A static version is to be made first, which only updates upon page refresh; future versions may periodically query and update.

    

- (WIP) Ability to dynamically track total time usage across different websites. Create custom tracking & timer in extension popup.

    - Subgoal(WIP): Popup should list previously or recently visited sites as selection choices. Alternatively, a texbox to enter an URL domain for tracking.

    - Subgoal(In Progress): Overhaul popup. The popup should add options for clearing different databases, including local, continuous, miunute, hour, and day as a checklist. DB reset targets only selected db's. Preferences saved in a "settings" objectstore in indexeddb. Collapsible. 

- (WIP) Persistant timer-based alarms and tab destruction capabilities. Depending on popup choices, ring an alarm or destroy tabs upon usage timer reaching some point;
