# staplebomb
A web extension that keeps track of how long you spend on websites(soon). In the future it can destroy your tabs

# background processes
Every minute mark a package of use times is sent to IndexedDB for records keeping. An aggregate segment of the DB keeps track of aggregate times for each site, such as:
- Total amount of time spent in the last 10 minutes
- Total amount of time spent in the last hour
- Total amount of time spent in the last 6 hours
- Total amount of time spent in the last 24 hours

Based on UNIX time factor 1000 * 3600 * 24, 
