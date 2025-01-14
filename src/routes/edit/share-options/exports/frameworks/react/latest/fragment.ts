import {
	Document,
	DocumentView,
	Folder,
	Html,
	Json
} from '@carbon/react/icons';
import { getAllFragmentStyleClasses } from '../../../../../../../ui-fragment/src/utils';
import { hasFragmentStyleClasses } from '../../../../../../../utils/fragment-tools';
import { format } from '../../utils';
import {
	formatOptions,
	formatOptionsCss,
	getAdditionalCodeAsString,
	jsonToCarbonImports,
	jsonToTemplate,
	otherImportsFromComponentObj
} from './utils';
import { classNameFromFragment, tagNameFromFragment } from '../../../../../../../sdk/src/tools';

const generateTemplate = (json: any, fragments: any[]) => {
	const carbonImports = jsonToCarbonImports(json);
	const carbonImportsString = carbonImports.reduce((string: string, curr: string) => (
		string += `${curr}, `
	), '');
	return {
		imports: `import { ${carbonImportsString} } from '@carbon/react';
			${otherImportsFromComponentObj(json, fragments)}`,
		template: jsonToTemplate(json, fragments),
		additionalCode: getAdditionalCodeAsString(json, fragments)
	};
};

const jsonToSharedComponents = (json: any, fragments: any[], globalStyleClasses: any) => {
	let sharedComponents: any[] = [];

	if (json.type === 'fragment') {
		const fragment = fragments.find(f => f.id === json.fragmentId);
		const fragmentTemplate = generateTemplate(fragment.data, fragments);

		sharedComponents.push({
			name: `${tagNameFromFragment(fragment)}.js`,
			code: format(`import React from 'react';
				${fragmentTemplate.imports};
				${hasFragmentStyleClasses(fragment) ? `
					import './${tagNameFromFragment(fragment)}.scss';
				` : ''}
				export const ${classNameFromFragment(fragment)} = ({state, setState}) => {
					const handleInputChange = (event) => {
						setState({...state, [event.target.name]: event.target.value});
					};

					${fragmentTemplate.additionalCode}

					return <>${fragmentTemplate.template}</>;
				};
			`, formatOptions),
			icon: Document
		});

		sharedComponents.push({
			name: `${tagNameFromFragment(fragment)}.scss`,
			code: format(
				`${getAllFragmentStyleClasses(fragment, [], globalStyleClasses).map((styleClass: any) => `.${styleClass.id} {
					${styleClass.content}
				}`).join('\n')}`,
				formatOptionsCss
			),
			icon: DocumentView
		});

		sharedComponents = [
			...sharedComponents,
			...jsonToSharedComponents(fragment.data, fragments, globalStyleClasses)
		];
	}

	json.items?.forEach((item: any) => {
		sharedComponents = [
			...sharedComponents,
			...jsonToSharedComponents(item, fragments, globalStyleClasses)
		];
	});

	return sharedComponents;
};

export const createReactApp = (fragment: any, fragments: any[], globalStyleClasses: any) => {
	const fragmentTemplate = generateTemplate(fragment.data, fragments);

	const sharedComponents = jsonToSharedComponents(fragment.data, fragments, globalStyleClasses);

	const indexHtml = `<div id='root'></div>
`;
	const componentJs
		= `import React from 'react';
${fragmentTemplate.imports};
${hasFragmentStyleClasses(fragment) ? "\nimport './component.scss';\n" : ''}
export const FragmentComponent = ({state, setState}) => {
	const handleInputChange = (event) => {
		setState({...state, [event.target.name]: event.target.value});
	};

	${fragmentTemplate.additionalCode}

	return <>${fragmentTemplate.template}</>;
};
`;

	const componentScss = getAllFragmentStyleClasses(fragment, [], globalStyleClasses).map((styleClass: any) => {
		if (!styleClass.content || !styleClass.content.trim()) {
			return null;
		}

		return `.${styleClass.id} {
			${styleClass.content}
		}`;
	}).join('\n');

	const indexJs
		= `import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import "@carbon/styles/css/styles.css";

import { FragmentComponent } from './component.js';

const App = () => {
	const [state, setState] = useState({});

	return (
		<div>
			<FragmentComponent state={state} setState={setState} />
		</div>
	);
}
ReactDOM.render(<App />, document.getElementById('root'));
`;
	const packageJson = {
		dependencies: {
			'carbon-components': '10.58.0',
			'@carbon/react': '1.36.0',
			'@carbon/styles': '1.36.0',
			react: '16.12.0',
			'react-dom': '16.12.0',
			'react-scripts': '3.0.1',
			'sass': '1.45.0',
			emotion: '10.0.27'
		}
	};

	return [
		{
			name: 'package.json',
			code: packageJson,
			icon: Json
		},
		{
			name: 'src',
			icon: Folder,
			isExpanded: true,
			items: [
				{
					name: 'index.html',
					code: indexHtml,
					icon: Html
				},
				{
					name: 'index.js',
					code: format(indexJs, formatOptions),
					icon: Document
				},
				{
					name: 'component.js',
					code: format(componentJs, formatOptions),
					icon: Document
				},
				{
					name: 'component.scss',
					code: format(componentScss, formatOptionsCss),
					icon: DocumentView
				},
				...(sharedComponents && sharedComponents.length > 0 ? [{
					name: 'shared',
					icon: Folder,
					isExpanded: true,
					items: sharedComponents
				}] : [])
			]
		}
	];
};
