module.exports = {
    darkMode: 'class',
    content: [
		'./index.html',
		'./src/**/*.{js,ts,jsx,tsx}'
	],
    theme: {
        extend: {},
    },
    plugins: [      
        new webpack.ProvidePlugin(
            {
                process: 'process/browser',
            }
        ),
    ],
};