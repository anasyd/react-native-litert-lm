///
/// LiteRTLMAutolinking.mm
/// Registers the C++ HybridLiteRTLM implementation with NitroModules on iOS.
///
/// On iOS, there's no JNI_OnLoad equivalent, so we use ObjC +load to register
/// the HybridObject factory before JS tries to create it.
///

#import <Foundation/Foundation.h>
#include <NitroModules/HybridObjectRegistry.hpp>
#include "HybridLiteRTLM.hpp"

@interface LiteRTLMAutolinking : NSObject
@end

@implementation LiteRTLMAutolinking

+ (void)load {
  using namespace margelo::nitro;
  using namespace margelo::nitro::litertlm;
  
  HybridObjectRegistry::registerHybridObjectConstructor(
    "LiteRTLM",
    []() -> std::shared_ptr<HybridObject> {
      return std::make_shared<HybridLiteRTLM>();
    }
  );
}

@end
