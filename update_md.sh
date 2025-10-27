#!/bin/bash

rm REFERENCES/ADM*.md
rm REFERENCES/USE*.md
rm REFERENCES/HOWTO*.md
rm REFERENCES/TO*.md

 cp ../auth_fast_api/docs/USERS.md ./REFERENCES/.
 cp ../auth_fast_api/docs/HOWTOUSE_USERS.md ./REFERENCES/.