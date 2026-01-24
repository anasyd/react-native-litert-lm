package dev.litert.litertlm

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.margelo.nitro.core.HybridObject


import com.margelo.nitro.dev.litert.litertlm.LiteRTLMOnLoad

class LiteRTLMPackage : TurboReactPackage() {
    init {
        LiteRTLMOnLoad.initializeNative()
    }


    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return null
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider { emptyMap<String, ReactModuleInfo>() }
    }
}
