{
	"targets": [{
		"target_name": "shm",
		"include_dirs": [
			"src",
			"<!(node -e \"require('nan')\")",
		],
		"sources": [
			"src/node_shm.h",
			"src/node_shm.cc"
		],
		"conditions": [
			["OS=='win'", {
				"msvs_settings": {
					"VCCLCompilerTool": {
						"ExceptionHandling": 1
					}
				}
			}],
			["OS!='win' and OS!='mac'", {
				"libraries": [
					"-lrt"
				]
			}]
		],
	}]
}
