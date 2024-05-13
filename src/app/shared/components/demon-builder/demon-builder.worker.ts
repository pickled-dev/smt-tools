import { P5_DEMON_BUILDER } from '@shared/constants'
import {
	ResultsMessage,
	FusionChain,
	InputChainData,
} from '@shared/types/smt-tools.types'
import { DoWorkUnit, runWorker } from 'observable-webworker'
import { Observable, ReplaySubject, Subject, Subscription } from 'rxjs'

/* Class to run the fusion calculator in a web worker utilizes the 
    observable-worker library to make things much easier to deal with 
    https://github.com/cloudnc/observable-webworker*/
export class DemonBuilderWorker
	implements DoWorkUnit<InputChainData, ResultsMessage>
{
	chains: FusionChain[] = []
	demonBuilder = P5_DEMON_BUILDER

	public workUnit(input: InputChainData): Observable<ResultsMessage> {
		const output$: Subject<ResultsMessage> = new ReplaySubject(Infinity)
		const sub = this.demonBuilder.chainMessageObservable.subscribe(
			(data) => {
				output$.next({
					results: data.results,
					combo: data.combo,
					error: data.error,
				})
			}
		)
		this.calculate(input)
		sub.unsubscribe()
		return output$
	}

	private calculate(inputData: InputChainData): Observable<ResultsMessage> {
		this.demonBuilder.deep = inputData.deep
		if (inputData.level) this.demonBuilder.maxLevel = inputData.level
		if (inputData.demonName) {
			return this.demonBuilder.getChains(
				inputData.inputSkills,
				inputData.demonName
			)
		}
		return this.demonBuilder.getChains(inputData.inputSkills)
	}
}

runWorker(DemonBuilderWorker)
