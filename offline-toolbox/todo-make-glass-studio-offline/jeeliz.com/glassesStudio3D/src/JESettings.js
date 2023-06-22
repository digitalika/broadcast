/*

Many parameters are arrays, where the index is the level of performance.
When we create the webgl context, we check the level of performance:

 - 0: very low device (smartphone)
 - 1: low devices (nice smartphones, ipads, low configuration laptops)
 - 2: normal devices (desktop)
 - 3: insane mode only (only used when insaneMode is set to true)

*/

var JESETTINGS = {
  // DEBUG0 prod version: all should be set to false
  debugNoSleep: true, // do not go into high quality but slow mode
  debugEmulateHalfFloat: false, // to debug half float comportement
  debugEmulateLevel: false,
  debugNoStartAnimate: false,
  debugDisableDrawBuffers: false, // force disable the WEBGL_DRAW_BUFFERS extensions
  debugDrawBuffersFail: false,

  nnglMode: false,
  rawOutputWithAlpha: false, // in JEScene, output result without AA but with alpha channel
  insaneMode: false,         // force the insane mode: need at least a Nvidia GTX7XX ! Only for showrooms !
  noWebGLRedirectURL: false, // redirect URL if the user is not compatible
  basePath: '',
  materialTextureBasePath: '', // if empty string, do not take into account
  autoSleepTimeout: 700,       // delay in ms after which the viewer switch to HQ but slow mode
  autoScaleMaxDim: 200,        // max X/Y/Z dimension for a mesh when autoscale is set to true
  disablePhysics: false, 

  // EXTENSIONS
  useDDS: false,  // use DDS compressed textures. not implemented yet
  useSrgb: false, // use SRGB extension. still VERY experimental
  useAnisotropic: false, // use anisotropic texture filtering
  anisotropicFilteringLevel: 3, // texture filtering level: 3-> cubic filtering, 4-> quadratic filtering

  // WEBWORKERS
  enableWorkers: false,

  // BACKGROUND AND LIGHTING  
  background_RGBE: true,
  background_env: 'images/backgrounds/interior2.jpg',        // URL of the background env image. should be POT
  background_light: 'images/backgrounds/interior_light.jpg', // URL of the background lighting image. should be pot
  background_width: [256,256,512,512], // resolution in pixels of the background
  background_envLightCoefficient: 2.1, // applied only to background_env
  background_lightCoefficient: 8, // applied only to background_light
  backgroundIrradiance_width: [64,128,256,256], // resolution in pixels of the irradiance map
  irradianceNumberRays: [60, 96, 160, 250], // number of rays launched per pixel to compute the irradiance map
  irradianceBlurNPass: [8,12,18, 40], // number of gaussian blur passes applied to the irradiance map
  
  // POSTPROCESSING: 
  postProcessingGamma: 2.2, // gamma factor
  postProcessingSaturation: 1,
  //RGBfactor: [0.96, 1.016, 1.015], // RGB coefficient applied as postprocessing. [1,1,1] -> no correction. Representation of the white balance

  // CAMERA
  cameraDistance0: 150,   // initial distance of the camera
  cameraDistanceMax: 1000, // maximum distance of the camera (zoom min)
  cameraDistanceMin: 50,  // minimum distance of the camera (zoom max)
  cameraX0: 0,   // initial X position of the camera (pivot)
  cameraY0: 0,   // initial Y position of the camera (pivot)
  cameraFOV: 45, // camera Field of View in degrees
  cameraZnear: 2,   // camera zNear
  cameraZfar: 2000, // camera zFar
  cameraPivotZ: 40, // height of the camera pivot

  // CONTROLS
  wheelSensibility: 8, // sensibility of the mouse wheel
  zoomPow: 10,     // adaptative zoom factor (zoom more sensitive when the camera is nearest). 1 -> no adaptative zoom
  zoomSpeedMax: 5,   
  pinchSensibility: 0.1, // sensibility of the pinch (zoom with 2 fingers for touchpads)
  panSensibility: 5, // pan sensibility (right click only)
  pivotXMax: 100,   
  pivotYMax: 100,

  // VIEW ANGLES
  phiMin: -Math.PI/3,//Math.PI/12, // min angle around X axis (look up)
  phiMax: Math.PI/3,//(7/8)*Math.PI/2,  // max angle around Y axis (look down)
  phi0: 0,//Math.PI/6,   // angle around X (horizontal axis - look up/down)
  theta0: 0,//Math.PI/6, // angle around Y (vertical axis - look left/right)

  dt: [40, 32, 16, 16], // physics dt in ms
  amortization: [0., 0.87, 0.92, 0.90], // movement amortization. 0-> no amortization, 1->endless movement

  overSamplingFactor: 2, // in high quality but slow mode only, oversampling factor
  nRendersSleeping: 100, // number of renders when sleeping before pausing the render

  // AMBIENT OCCLUSION (HBAO)
  aoEnable: false, //true,
  aoDzFactor: 16, // compare dz with this value (to apply less AO when dz is smaller to avoid dirty symptomz)
  aoDzFactorMin: 0.4, // 1->do not apply DZ AO factor
  aoMax: [0.72, 0.73, 0.72, 0.74],     //0->no AO, 1-> full AO
  aoSharpness: 1.2, // sharpness of the AO. higher -> sharper AO
  aoOverSampling: [0.5,0.5,0.5,1], //compute the AO using full scale rendering (= 1) or half scale (= 0.5)
  aoStepMin: 2*70, // min size of a ray
  aoStepMax: 4*70, // max size of a ray
  aoStepPow: 1.2,  // higher -> launch more ray with min size than rays with max size. 1->linear
  aoMaxDpEdge0: 20, // soft thresholding: start reducing AO if dp>this value
  aoMaxDpEdge1: 40, // soft thresholding: do not apply AO if dp>this value
  aoRaySteps: [6, 9, 9, 12], // number of step per ray to check the angle
  aoOpacityMin: [0.03, 0.02, 0.02, 0.018], // opacity min (when sleeping mode)
  aoOpacityMax: [0.35, 0.35, 0.4, 0.5],    // opacity max (when awaked)
  aoMaxWaked: [0.2,0.2,0.2,0.2], // max AO when waked
  aoLightAttMax: [0.1, 0.15, 0.15, 0.15], // to prevent ghosting
  aoPeriod: [200, 200, 150, 120], // relaxation time for ao in ms
  aoNPasses: [1,2,3,5], // number of ao passes per render loop iteration
  
  // SHADOWING
  shadowLightFactor: 1.1,// light amplification factor. 1 -> do nothing, >1 -> amplification
  shadowSizeFactor: [1/4, 1/2, 1, 2], // multiply shadowWidth and shadowHeight by this factor
  shadowWidth: 256,  // shadow texture resolution width in pixels (when shadowSizeFactor=1)
  shadowHeight: 256, // shadow texture resolution height in pixels (when shadowSizeFactor=1)
  shadowDepth: 200, // in scene units
  shadowNumberRays: [40, 80, 200, 500], // number of rays per pixels launched to compute the shadow
  shadowRaySteps: [35,45,80, 120], // number of steps per ray launched

  // FACE CULLING
  cullingEnable: true,     // enable or disable backface culling
  cullingFrontFace: 'CCW', // possible values: CCW for CounterClockWise or CW for clockwise

}; //end JESETTINGS

//DEBUG ZONE