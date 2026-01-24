require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-litert-lm"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]
  s.platforms    = { :ios => "15.0" }
  s.source       = { :git => package["repository"]["url"], :tag => "#{s.version}" }
  
  s.swift_version = '5.0'

  s.source_files = [
    # Implementation (C++)
    "cpp/**/*.{hpp,cpp}",
    # Autolinking (Objective-C++)
    "ios/**/*.{m,mm}",
    # Nitrogen generated iOS bridge
    "nitrogen/generated/ios/**/*.{mm,swift}",
  ]

  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'CLANG_CXX_LIBRARY' => 'libc++',
    'HEADER_SEARCH_PATHS' => [
      '"$(PODS_TARGET_SRCROOT)/cpp"',
      '"$(PODS_TARGET_SRCROOT)/nitrogen/generated/shared/c++"',
      '"$(PODS_TARGET_SRCROOT)/nitrogen/generated/ios"',
    ].join(' '),
    # Stub mode - LiteRT-LM iOS not yet available
    'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) LITERT_LM_IOS_STUB=1',
  }

  # Load nitrogen autolinking
  load 'nitrogen/generated/ios/LiteRTLM+autolinking.rb'
  add_nitrogen_files(s)

  # Core dependencies only - no LLM runtime yet
  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  s.dependency 'ReactCommon/turbomodule/core'
  
  # TODO: Add LiteRT-LM iOS dependency when officially released
  # s.dependency 'LiteRTLM', '~> 1.0'

  install_modules_dependencies(s)
end
