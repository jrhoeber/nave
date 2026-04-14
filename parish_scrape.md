Create a script that parses parishes.txt

and pulls the following information for each parish (if any field isn't present, leave blank).
- name
- street_address
- city
- state
- postal_code
- established
- website
- mass_schedule (in mass schedule format outlined below)

If a parish has multiple worship sites, treat each site as it's own parish


Mass schedule should be a json blob with the following format

[
    {"day": "<day/days of week>}", "times": ["{<time1>}", "{<time2>}", ...]},
    ...
]

for example:
  [
    { "day": "Sunday", "times": ["8:00 AM", "10:00 AM", "12:00 PM"] },
    { "day": "Saturday", "times": ["5:00 PM"] },
    { "day": "Monday–Friday", "times": ["7:00 AM"] }
  ]

saturday and sunday should always be distinct entries, but weekdays can be combined when applicable (example above)

Once the infomation is pulled from the PDF, use the google places API to 
- Confirm the address of the parish based on parish name and postal_code

Write the output as a csv file called perishes.csv with the following columns
- name
- street_address
- city
- state
- postal_code
- diocese (always Diocese of Buffalo)
- established
- website
- mass_schedule (jsonb)
