require "json"

Pod::Spec.new do |s|
  s.name         = "tts"
  s.version      = "1.0.0"
  s.summary      = "tts based on tensorflow lite models"
  s.license      = "MIT"
  s.authors      = "lalalic@gmail.com"
  s.homepage     = "https://github.com/lalalic"
  s.source       = { :git => "https://github.com/lalalic/react-native-armotion.git", :tag => "#{s.version}" }
    

  s.platforms    = { :ios => "12.4" }
  
  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.dependency "React-Core"
  s.dependency "TensorFlowLiteSwift"  
end
