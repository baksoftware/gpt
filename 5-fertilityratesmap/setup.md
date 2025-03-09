# Setup


```
npm create vite@latest . -- --template react-swc-ts
```

Added world map from (see https://github.com/zcreativelabs/react-simple-maps)

```
cd public

curl --output world_map.json "https://unpkg.com/world-atlas@2.0.2/countries-110m.json"
```

add overrides from https://github.com/zcreativelabs/react-simple-maps/issues/367