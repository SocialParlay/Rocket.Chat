import { PaletteStyleTag } from '@rocket.chat/fuselage';
import { useThemeMode } from '@rocket.chat/ui-client';

import BrandPaletteStyleTag from '../../../components/BrandPaletteStyleTag';
import { codeBlock } from '../lib/codeBlockStyles';

export const MainLayoutStyleTags = () => {
	const theme = useThemeMode();

	return (
		<>
			<PaletteStyleTag theme={theme} selector='.rcx-content--main, .rcx-tile' tagId={`main-palette-${theme}`} />
			<BrandPaletteStyleTag theme={theme} selector='.rcx-content--main, .rcx-tile' tagId={`main-brand-palette-${theme}`} />
			<PaletteStyleTag theme='dark' selector='.rcx-sidebar--main, .rcx-sidebar-rail, .rcx-sidepanel, .rcx-navbar' tagId='sidebar-palette' />
			<BrandPaletteStyleTag
				theme='sidebar'
				selector='.rcx-sidebar--main, .rcx-sidebar-rail, .rcx-sidepanel, .rcx-navbar'
				tagId='sidebar-brand-palette'
			/>
			{theme === 'dark' && <PaletteStyleTag selector='.rcx-content--main' palette={codeBlock} tagId='codeBlock-palette' />}
		</>
	);
};
