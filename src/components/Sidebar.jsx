import { Link } from 'react-router-dom'
export default function Sidebar(){
 return(
   <aside style={{width:200,background:'#e8f0ff',padding:20,minHeight:'100vh'}}>
     <h3>MedIntelli</h3>
     <nav style={{display:'flex',flexDirection:'column',gap:10}}>
       <Link to='/'>Dashboard</Link>
     </nav>
   </aside>
 )
}