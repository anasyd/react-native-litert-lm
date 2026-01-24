# LiteRT-LM Headers Fallback

This directory is a fallback location for LiteRT-LM C++ headers when Prefab doesn't expose them correctly.

## If Headers Are Missing

If you get compilation errors like `litert/lm/engine.h: No such file or directory`, you need to manually copy LiteRT-LM headers here:

1. Clone LiteRT-LM repository:

   ```bash
   git clone https://github.com/google-ai-edge/LiteRT-LM.git /tmp/LiteRT-LM
   ```

2. Copy the headers:
   ```bash
   cp -r /tmp/LiteRT-LM/runtime/include/litert ./
   ```

The expected directory structure after copying:

```
cpp/include/
└── litert/
    └── lm/
        ├── engine.h
        ├── conversation.h
        ├── types.h
        └── ...
```

## Note

The ideal scenario is that the Maven package `litertlm-android:0.9.0-alpha01` exposes headers via Prefab, making this directory unnecessary. This is just a fallback.
