# when the user watches the video, all the actions like play, pause, seek, etc. will be sent to the backend for analytics purposes. The backend will store the data in a database and can be used for further analysis. 

                VIDEO
                  │
             ┌────┴────┐
             ↓         ↓
           PLAY      SEEKING
             │         │
             ↓         ↓
       timeupdate    don't count
             │         │
             ↓         ↓
       watchedTime   SEEKED
             │         │
             │         ↓
             │    new position
             │         │
             └────┬────┘
                  ↓
                PAUSE
                  ↓
          sendWatchDuration()
                  ↓
                API
                  ↓
              Backend
                  ↓
             MongoDB