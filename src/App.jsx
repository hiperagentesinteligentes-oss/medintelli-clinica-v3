import {Routes,Route} from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'

export default function App(){
 return(
   <div style={{display:'flex'}}>
     <Sidebar/>
     <div style={{flex:1,padding:20}}>
       <Routes>
         <Route path='/' element={<Dashboard/>}/>
       </Routes>
     </div>
   </div>
 )
}