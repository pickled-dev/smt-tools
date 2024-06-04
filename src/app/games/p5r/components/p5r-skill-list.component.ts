import { Component } from '@angular/core'

import { Skill, TableConfig } from '@shared/types/smt-tools.types'

import { P5R_COMPENDIUM, P5_TABLE_CONFIG } from '@shared/constants'

@Component({
	selector: 'app-p5-skill-list',
	template: ` <app-skill-list [skills]="skills" [tableConfig]="tableConfig">
	</app-skill-list>`,
	styleUrl: '../p5r.scss',
})
export class P5RSkillListComponent {
	skills: { [name: string]: Skill } = P5R_COMPENDIUM.skills
	tableConfig: TableConfig = P5_TABLE_CONFIG

	constructor() {}
}
