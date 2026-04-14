
# Lyntra Analytics Dashboard

This is the base Lyntra Analytics dashboard frontend react-native app. Uses supabase as a proxy for now before migrating data to a postgresql server. Utilizes Azure & Manual logs with a backend api call to the Lyntra App.




## Process

- Initial React-Native App Showcases all data as well as dedicated editor and investor views
- React-Native App pulls data from supabase cache of all relevant data.
- Editor view showcases adding new classes for further pilot expansion as well as adjusting pilot duration
- Editor view also allows editing or adding of new week logs with automation via azure logs and supabase combined with manual entries for logs such as (Professor or Student Responses)
- Investor view is a read on showcase of number -> English translations.


## To Run Locally

Clone the project

```bash
  git clone "https://github.com/Avi-Me1109/LyntraAnalytics.git"
```

Go to the project directory

```bash
  cd frontend/LyntraAnalytics
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npx expo start
```

