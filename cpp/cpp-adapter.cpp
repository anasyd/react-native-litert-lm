///
/// cpp-adapter.cpp
/// JNI Entry Point - Required by Nitrogen to register Kotlin HybridObjects
///

#include <jni.h>
#include "LiteRTLMOnLoad.hpp"

// JNI_OnLoad is called when the native library is loaded via System.loadLibrary()
// This is where we initialize the Nitrogen bridge and register all Kotlin HybridObjects
JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
    return margelo::nitro::litertlm::initialize(vm);
}
