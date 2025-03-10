# Setup


```
npm create vite@latest . -- --template react-swc-ts
```


Added world map from (see https://github.com/zcreativelabs/react-simple-maps)

https://www.npmjs.com/package/world-atlas


```
cd public

curl --output world_map.json "https://unpkg.com/world-atlas@2.0.2/countries-110m.json"
```

add overrides from https://github.com/zcreativelabs/react-simple-maps/issues/367


Numbers from ISO 3166-1 numeric country code

https://www.iso.org/obp/ui/#search/code/