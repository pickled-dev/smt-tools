import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'

import { P5HeaderComponent } from '@p5/components/p5-game-header.component'
import { P5RPersonaListComponent } from './components/p5r-persona-list.component'
import { P5RPersonaEntryComponent } from './components/p5r-persona-entry.component'
import { P5RFusionTableComponent } from './components/p5r-fusion-table.component'
import { P5RSkillListComponent } from './components/p5r-skill-list.component'

const routes: Routes = [
	{
		path: '',
		component: P5HeaderComponent,
		children: [
			{ path: 'personas', component: P5RPersonaListComponent },
			{
				path: 'personas/:demonName',
				component: P5RPersonaEntryComponent,
			},
			{ path: 'skills', component: P5RSkillListComponent },
			{ path: 'fusion-table', component: P5RFusionTableComponent },
		],
	},
]

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class P5RRoutingModule {}
