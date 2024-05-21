import { Component } from '@angular/core'

import { P5Compendium } from '@p5/types/p5-compendium'

import { P5_COMPENDIUM } from '@shared/constants'

@Component({
	selector: 'app-p5-demon-builder',
	template: `<app-demon-builder
		[compendium]="compendium"
		[worker]="worker"
		[loadingIcon]="loadingIcon"
	>
	</app-demon-builder>`,
	styleUrl: './p5-demon-builder.component.scss',
})
export class P5DemonBuilderComponent {
	compendium: P5Compendium = P5_COMPENDIUM
	worker: string = 'p5'
	loadingIcon: string = 'assets/img/games/p5/p5-loading.gif'

	constructor() {}
}
