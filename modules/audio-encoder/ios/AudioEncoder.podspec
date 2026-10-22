Pod::Spec.new do |s|
  s.name           = 'AudioEncoder'
  s.version        = '0.1.0'
  s.summary        = 'Encodes the PCM WAV files of a recording into one AAC .m4a.'
  s.description    = 'Local Expo module of Tolitoli (D-021).'
  s.license        = 'UNLICENSED'
  s.author         = 'Tolitoli'
  s.homepage       = 'https://tolitoli.app'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
